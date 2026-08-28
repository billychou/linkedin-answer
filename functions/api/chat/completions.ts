import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { getEntitlements } from "../../_lib/billing";
import {
  appendMessage,
  getOrCreateConversation,
  listMessages,
} from "../../_lib/chat";
import { consumeChatQuota } from "../../_lib/quota";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import { extractSseDeltas } from "../../_lib/sse";
import { z } from "zod";

interface ChatEnv extends AuthEnv {
  /** OpenAI 兼容接口基址（默认 DashScope 兼容模式）。 */
  CHAT_BASE_URL?: string;
  /** 模型密钥；未配置时回退 DASHSCOPE_API_KEY（与 CI 抓取共用一把钥匙的便利项）。 */
  CHAT_API_KEY?: string;
  DASHSCOPE_API_KEY?: string;
  CHAT_MODEL?: string;
}

interface Context {
  request: Request;
  env: ChatEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen-plus";
const DAY_MS = 24 * 60 * 60 * 1000;
/** 发给模型的历史窗口条数（含刚写入的用户消息）。 */
const CONTEXT_MESSAGES = 24;

const SYSTEM_PROMPT = `You are the AI assistant of LinkedIn Answers (linkedinanswers.com), a site publishing daily answers and strategies for LinkedIn's puzzle games: Pinpoint, Queens, Tango, Zip, Crossclimb, Patches and Mini Sudoku.

Rules:
- Help players understand the rules of these games and solve today's puzzle step by step.
- Prefer giving hints and reasoning strategies first; reveal the direct answer only when the user clearly asks for it.
- Be concise and friendly; use the player's language.
- Never invent answer content you do not know; when unsure, explain the solving approach instead.`;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(20000),
      })
    )
    .min(1)
    .max(200),
});

/**
 * POST /api/chat/completions — 服务端聊天补全（OpenAI 兼容，SSE 透传）。
 *
 * 与客户端直连模型的区别：鉴权、限流、套餐配额扣减、历史窗口裁剪、
 * 会话持久化（user + assistant 双写）全部在服务端强制完成。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const apiKey = env.CHAT_API_KEY ?? env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: "AI chat is being set up. Please try again later." },
      503
    );
  }

  const limited = await rateLimitOr429(env, request, "chat/completions", 120, 3600);
  if (limited) return limited;

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid input" }, 400);
  }
  const lastUser = [...parsed.data.messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUser) {
    return jsonResponse({ error: "No user message" }, 400);
  }

  const db = env.DB;

  // 配额：服务端检查 + 扣减一次完成，超限直接 429（不消耗模型调用）。
  const entitlements = await getEntitlements(db, auth.user.id);
  const quota = await consumeChatQuota(db, auth.user, entitlements);
  if (!quota.ok) {
    return jsonResponse(
      {
        error: "Daily limit reached, please upgrade your plan",
        ...quota.quota,
      },
      429
    );
  }

  // 持久化用户消息，并取套餐窗口内的历史作为模型上下文（以库为准）。
  const conversation = await getOrCreateConversation(db, auth.user.id);
  await appendMessage(db, conversation.id, "user", lastUser.content);

  const since = Date.now() - entitlements.features.historyDays * DAY_MS;
  const history = await listMessages(db, conversation.id, since);
  const modelMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-CONTEXT_MESSAGES).map(({ role, content }) => ({
      role,
      content,
    })),
  ];

  const baseUrl = (env.CHAT_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = env.CHAT_MODEL ?? DEFAULT_MODEL;

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: modelMessages, stream: true }),
    });
  } catch {
    return jsonResponse({ error: "AI service unreachable" }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 300);
    console.error(
      `chat/completions upstream ${upstream.status}: ${detail || "(empty)"}`
    );
    return jsonResponse({ error: "AI service error" }, 502);
  }

  // SSE 透传：字节原样转发给浏览器，同时解析增量用于落库。
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let sseBuffer = "";
  let persisted = false;

  const persistAssistant = (): Promise<void> => {
    if (persisted) return Promise.resolve();
    persisted = true;
    const text = accumulated.trim();
    if (!text) return Promise.resolve();
    return appendMessage(db, conversation.id, "assistant", text)
      .catch((e) => console.error("chat persist failed", e))
      .then(() => undefined);
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          await persistAssistant();
          return;
        }
        const { deltas, rest } = extractSseDeltas(
          sseBuffer + decoder.decode(value, { stream: true })
        );
        sseBuffer = rest;
        accumulated += deltas;
        controller.enqueue(value);
      } catch (e) {
        controller.error(e);
        await persistAssistant();
      }
    },
    cancel() {
      // 浏览器中断（停止生成/关闭页面）：保留已产出的部分回复。
      void reader.cancel();
      void persistAssistant();
    },
  });

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

  // 提示运行时不要在响应返回后立即回收（若平台支持）。
  context.waitUntil?.(persistAssistant());

  return response;
};
