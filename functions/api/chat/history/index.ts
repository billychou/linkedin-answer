import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { getEntitlements } from "../../../_lib/billing";
import {
  clearMessages,
  getOrCreateConversation,
  listMessages,
} from "../../../_lib/chat";

interface Context {
  request: Request;
  env: AuthEnv;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET    /api/chat/history — 当前会话消息（按套餐 historyDays 裁剪）
 * DELETE /api/chat/history — 清空会话
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "GET" && request.method !== "DELETE") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const db = env.DB!;
  const conversation = await getOrCreateConversation(db, auth.user.id);

  if (request.method === "DELETE") {
    await clearMessages(db, conversation.id);
    return jsonResponse({ ok: true });
  }

  const entitlements = await getEntitlements(db, auth.user.id);
  const since = Date.now() - entitlements.features.historyDays * DAY_MS;
  const messages = await listMessages(db, conversation.id, since);
  return jsonResponse({
    conversation_id: conversation.id,
    plan: entitlements.planId,
    history_days: entitlements.features.historyDays,
    messages,
  });
};
