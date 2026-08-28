/**
 * 配额计量共享逻辑（usage_daily，migration 0003）。
 *
 * 供 /api/billing/quota 与 /api/chat/completions 复用：
 * 配额检查与扣减必须在服务端一次完成，前端不再预扣。
 */

import type { D1Database, DbUser } from "./db";
import type { Entitlements } from "./billing";

export const QUOTA_METRICS = new Set(["chat"]);

/** 用户时区下的 YYYY-MM-DD（配额按用户的"天"计算）。 */
export function localDateString(timezone: string): string {
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

export async function getUsage(
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

export interface QuotaSnapshot {
  plan: string;
  metric: string;
  limit: number;
  used_today: number;
  remaining: number;
}

export type ConsumeResult =
  | { ok: true; quota: QuotaSnapshot }
  | { ok: false; reason: "limit"; quota: QuotaSnapshot };

/**
 * 检查并扣减一次 chat 配额（原子完成：先查后写）。
 * 未超限时计数 +1 并返回 ok；超限返回 reason "limit"（计数不变）。
 */
export async function consumeChatQuota(
  db: D1Database,
  user: DbUser,
  entitlements: Entitlements
): Promise<ConsumeResult> {
  const date = localDateString(user.timezone);
  const metric = "chat";
  const used = await getUsage(db, user.id, date, metric);
  const limit = entitlements.features.chatPerDay;

  if (used >= limit) {
    return {
      ok: false,
      reason: "limit",
      quota: {
        plan: entitlements.planId,
        metric,
        limit,
        used_today: used,
        remaining: 0,
      },
    };
  }

  await db
    .prepare(
      `INSERT INTO usage_daily (user_id, date, metric, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(user_id, date, metric) DO UPDATE SET count = count + 1`
    )
    .bind(user.id, date, metric)
    .run();

  return {
    ok: true,
    quota: {
      plan: entitlements.planId,
      metric,
      limit,
      used_today: used + 1,
      remaining: limit - used - 1,
    },
  };
}
