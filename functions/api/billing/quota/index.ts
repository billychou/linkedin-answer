import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { getEntitlements } from "../../../_lib/billing";
import { rateLimitOr429 } from "../../../_lib/rateLimit";
import type { D1Database } from "../../../_lib/db";

interface Context {
  request: Request;
  env: AuthEnv;
}

const METRICS = new Set(["chat"]);

/** 用户时区下的 YYYY-MM-DD（配额按用户的"天"计算）。 */
function localDateString(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function getUsage(
  db: D1Database,
  userId: string,
  date: string,
  metric: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT count FROM usage_daily WHERE user_id = ? AND date = ? AND metric = ?`
    )
    .bind(userId, date, metric)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/**
 * GET  /api/billing/quota — 当前配额与今日用量
 * POST /api/billing/quota { metric } — 消耗一次配额（发送 chat 前调用）
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
  const date = localDateString(auth.user.timezone);
  const metric = "chat";

  if (request.method === "GET") {
    const used = await getUsage(db, auth.user.id, date, metric);
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

  const used = await getUsage(db, auth.user.id, date, metric);
  const limit = entitlements.features.chatPerDay;
  if (used >= limit) {
    return jsonResponse(
      {
        error: "Daily limit reached, please upgrade your plan",
        plan: entitlements.planId,
        limit,
        used_today: used,
        remaining: 0,
      },
      429
    );
  }

  await db
    .prepare(
      `INSERT INTO usage_daily (user_id, date, metric, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(user_id, date, metric) DO UPDATE SET count = count + 1`
    )
    .bind(auth.user.id, date, metric)
    .run();

  return jsonResponse({
    plan: entitlements.planId,
    metric,
    limit,
    used_today: used + 1,
    remaining: limit - used - 1,
  });
};
