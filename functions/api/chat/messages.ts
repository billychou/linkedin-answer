import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { appendMessage, getOrCreateConversation } from "../../_lib/chat";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
}

const bodySchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20000),
  })
  .strict();

/** POST /api/chat/messages { role, content } — 追加一条消息到当前会话。 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const limited = await rateLimitOr429(env, request, "chat/messages", 300, 3600);
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

  const conversation = await getOrCreateConversation(env.DB, auth.user.id);
  const message = await appendMessage(
    env.DB,
    conversation.id,
    parsed.data.role,
    parsed.data.content
  );
  return jsonResponse({ message }, 201);
};
