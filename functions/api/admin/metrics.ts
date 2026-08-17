import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";

interface Context {
  request: Request;
  env: AuthEnv;
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function count(db: NonNullable<AuthEnv["DB"]>, sql: string, ...bind: unknown[]): Promise<number> {
  const row = await db.prepare(sql).bind(...bind).first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * GET /api/admin/metrics — 运营指标（仅站点管理员）。
 * 注册/活跃/租户/订阅(MRR)/收入/chat 与打卡趋势。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (auth.user.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const db = env.DB;
  const now = Date.now();

  const [
    usersTotal,
    usersActive7d,
    usersNew7d,
    usersNew30d,
    tenantsTotal,
    tenantsPersonal,
    invoicesPaidCount,
  ] = await Promise.all([
    count(db, `SELECT COUNT(*) AS n FROM users WHERE status = 'active'`),
    count(db, `SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND last_login_at >= ?`, now - 7 * DAY_MS),
    count(db, `SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND created_at >= ?`, now - 7 * DAY_MS),
    count(db, `SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND created_at >= ?`, now - 30 * DAY_MS),
    count(db, `SELECT COUNT(*) AS n FROM tenants WHERE status = 'active'`),
    count(db, `SELECT COUNT(*) AS n FROM tenants WHERE status = 'active' AND is_personal = 1`),
    count(db, `SELECT COUNT(*) AS n FROM invoices WHERE status = 'paid'`),
  ]);

  // MRR：活跃订阅按月折算（年付 / 12）。
  const { results: subRows } = await db
    .prepare(
      `SELECT s.plan_id AS plan_id, p.price_cents AS price_cents,
              p.billing_interval AS billing_interval, COUNT(*) AS n
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.status IN ('active', 'trialing', 'past_due')
         AND s.current_period_end > ?
       GROUP BY s.plan_id`
    )
    .bind(now)
    .all<{ plan_id: string; price_cents: number; billing_interval: string; n: number }>();
  const subscriptionsByPlan: Record<string, number> = {};
  let mrrCents = 0;
  let paidActive = 0;
  for (const row of subRows) {
    subscriptionsByPlan[row.plan_id] = row.n;
    paidActive += row.n;
    const monthly =
      row.billing_interval === "year" ? row.price_cents / 12 : row.price_cents;
    mrrCents += Math.round(monthly * row.n);
  }

  const revenueTotal = await db
    .prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS s FROM invoices WHERE status = 'paid'`)
    .first<{ s: number }>();
  const revenue30d = await db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS s FROM invoices WHERE status = 'paid' AND created_at >= ?`
    )
    .bind(now - 30 * DAY_MS)
    .first<{ s: number }>();

  const { results: signupsByDay } = await db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS d, COUNT(*) AS n
       FROM users WHERE created_at >= ? GROUP BY d ORDER BY d`
    )
    .bind(now - 30 * DAY_MS)
    .all<{ d: string; n: number }>();

  const { results: chatByDay } = await db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS d, COUNT(*) AS n
       FROM chat_messages WHERE created_at >= ? GROUP BY d ORDER BY d`
    )
    .bind(now - 14 * DAY_MS)
    .all<{ d: string; n: number }>();

  const { results: activityByDay } = await db
    .prepare(
      `SELECT date AS d, COUNT(*) AS n FROM user_activity
       WHERE date >= strftime('%Y-%m-%d', ? / 1000, 'unixepoch')
       GROUP BY d ORDER BY d`
    )
    .bind(now - 14 * DAY_MS)
    .all<{ d: string; n: number }>();

  return jsonResponse({
    users: {
      total: usersTotal,
      active_7d: usersActive7d,
      new_7d: usersNew7d,
      new_30d: usersNew30d,
      signups_by_day: signupsByDay,
    },
    tenants: {
      total: tenantsTotal,
      personal: tenantsPersonal,
      team: tenantsTotal - tenantsPersonal,
    },
    billing: {
      paid_active: paidActive,
      by_plan: subscriptionsByPlan,
      mrr_cents: mrrCents,
      revenue_total_cents: revenueTotal?.s ?? 0,
      revenue_30d_cents: revenue30d?.s ?? 0,
      invoices_paid: invoicesPaidCount,
    },
    engagement: {
      chat_by_day: chatByDay,
      activity_by_day: activityByDay,
    },
  });
};
