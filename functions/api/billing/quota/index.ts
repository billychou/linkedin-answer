import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { getEntitlements } from "../../../_lib/billing";
import { consumeChatQuota, getUsage, localDateString } from "../../../_lib/quota";
import { rateLimitOr429 } from "../../../_lib/rateLimit";

interface Context {
  request: Request;
  env: AuthEnv;
}

const METRICS = new Set(["chat"]);

/**
 * GET  /api/billing/quota — 当前配额与今日用量
 * POST /api/billing/quota { metric } — 消耗一次配额（兼容旧调用；
 *      实时聊天请改用 /api/chat/completions，配额在服务端强制）
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const db = env.DB!;
  const entitlements = await getEntitlements(db, auth.user.id);
  const metric = "chat";

  if (request.method === "GET") {
    const used = await getUsage(
      db,
      auth.user.id,
      localDateString(auth.user.timezone),
      metric
    );
    const limit = entitlements.features.chatPerDay;
    return jsonResponse({
      plan: entitlements.planId,
      metric,
      limit,
      used_today: used,
      remaining: Math.max(0, limit - used),
    });
  }

  const limited = await rateLimitOr429(env, request, "billing/quota", 300, 3600);
  if (limited) return limited;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* 允许空 body，默认消耗 chat */
  }
  const requested = (body as { metric?: string }).metric ?? metric;
  if (!METRICS.has(requested)) {
    return jsonResponse({ error: "Unknown metric" }, 400);
  }

  const result = await consumeChatQuota(db, auth.user, entitlements);
  if (!result.ok) {
    return jsonResponse(
      {
        error: "Daily limit reached, please upgrade your plan",
        ...result.quota,
      },
      429
    );
  }
  return jsonResponse(result.quota);
};
