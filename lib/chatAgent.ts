import { ChatMessage } from "@/types/chat";

/**
 * 智能体 API 地址。
 * 在 .env / .env.local 中配置 NEXT_PUBLIC_AGENT_API_URL 后即切换为真实请求；
 * 未配置时使用本地 mock 流式回复（demo 开箱即用）。
 * 注意：本项目是静态导出（output: "export"），NEXT_PUBLIC_* 环境变量在
 * 构建时内联，切换模式需要重新构建。
 */
export const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL ?? "";

export const isAgentLive = AGENT_API_URL.length > 0;

/** 发送给智能体的请求体（OpenAI 兼容格式） */
interface AgentChatPayload {
  messages: Pick<ChatMessage, "role" | "content">[];
  stream: boolean;
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/** 可被 AbortSignal 中断的 sleep */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * 与智能体对话，逐块 yield 回复文本。
 * - 未配置 AGENT_API_URL：mock 模式，模拟流式输出
 * - 已配置：POST JSON 到该地址，按 OpenAI 兼容 SSE 协议解析
 */
export async function* streamChat(
  messages: Pick<ChatMessage, "role" | "content">[],
  options: { signal: AbortSignal }
): AsyncGenerator<string> {
  if (isAgentLive) {
    yield* liveStream(messages, options.signal);
  } else {
    yield* mockStream(messages, options.signal);
  }
}

/* ------------------------------ Mock 模式 ------------------------------ */

const MOCK_REPLIES = [
  "你好！我是运行在 Mock 模式下的智能体。\n\n当前没有配置真实的智能体接口（NEXT_PUBLIC_AGENT_API_URL），所以这条回复是本地模拟的流式输出，用来测试聊天框的以下能力：\n\n1. SSE 流式渲染（打字机效果）\n2. 停止生成\n3. 多轮对话\n\n配置真实接口后，这里会展示智能体的实际回复。",
  "这是一条模拟的智能体回复，用于验证前端聊天框的流式渲染能力。\n\n你可以在 .env.local 中设置 NEXT_PUBLIC_AGENT_API_URL 指向一个 OpenAI 兼容的对话接口（例如 /v1/chat/completions），页面会自动切换为真实请求模式。",
  "收到你的消息！（Mock 模式）\n\n聊天框正在按 chunk 逐块渲染这段文本，模拟真实智能体的 SSE 流式输出。试着点击「停止」按钮，验证中断生成后已输出的内容会被保留。",
];

function pickMockReply(messages: Pick<ChatMessage, "role" | "content">[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const seed = lastUser ? lastUser.content.length + lastUser.content.charCodeAt(0) : 0;
  return MOCK_REPLIES[seed % MOCK_REPLIES.length];
}

async function* mockStream(
  messages: Pick<ChatMessage, "role" | "content">[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const reply = pickMockReply(messages);
  // 按词/字切块，模拟逐 token 输出
  const chunks = reply.match(/\S+\s*/g) ?? [reply];
  for (const chunk of chunks) {
    if (signal.aborted) throw abortError();
    await sleep(25, signal);
    yield chunk;
  }
}

/* ------------------------------ 真实接口 ------------------------------ */

async function* liveStream(
  messages: Pick<ChatMessage, "role" | "content">[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const payload: AgentChatPayload = { messages, stream: true };

  const res = await fetch(AGENT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Agent request failed (${res.status} ${res.statusText})`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    yield* parseSseStream(res, signal);
    return;
  }

  // 非流式兜底：整段返回
  const text = await res.text();
  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      const content =
        parsed?.content ??
        parsed?.choices?.[0]?.message?.content ??
        parsed?.answer ??
        "";
      if (content) yield String(content);
    } catch {
      yield text;
    }
  } else if (text) {
    yield text;
  }
}

/** 解析 OpenAI 兼容的 SSE 流：`data: {...choices[0].delta.content...}`，以 `data: [DONE]` 结束 */
async function* parseSseStream(
  res: Response,
  signal: AbortSignal
): AsyncGenerator<string> {
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE 帧可能跨 chunk 截断：只解析完整行，剩余留在 buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // 空行 / 注释（keep-alive）
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const delta =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.delta ??
            parsed?.content ??
            "";
          if (delta) yield String(delta);
        } catch {
          // 跳过畸形的 data 行
        }
      }
    }

    // 处理 buffer 中残留的最后一行
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data:")) {
      const data = trimmed.slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const delta =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.delta ??
            parsed?.content ??
            "";
          if (delta) yield String(delta);
        } catch {
          // 跳过畸形数据
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
