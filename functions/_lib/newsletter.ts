/**
 * 邮件订阅数据访问层（migrations/0007_subscriptions.sql）。
 * 匿名订阅：不与 users 关联，退订走不可猜测的 token 链接。
 */

import type { D1Database } from "./db";

export interface DbSubscription {
  id: string;
  email: string;
  token: string;
  source: string;
  subscribed_at: number;
  unsubscribed_at: number | null;
  last_digest_date: string | null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function getSubscriptionByEmail(
  db: D1Database,
  email: string
): Promise<DbSubscription | null> {
  return db
    .prepare(
      `SELECT id, email, token, source, subscribed_at, unsubscribed_at, last_digest_date
       FROM email_subscriptions WHERE email = ?`
    )
    .bind(email)
    .first<DbSubscription>();
}

export async function getSubscriptionByToken(
  db: D1Database,
  token: string
): Promise<DbSubscription | null> {
  return db
    .prepare(
      `SELECT id, email, token, source, subscribed_at, unsubscribed_at, last_digest_date
       FROM email_subscriptions WHERE token = ?`
    )
    .bind(token)
    .first<DbSubscription>();
}

/**
 * 订阅（幂等）：新邮箱则创建；已退订则恢复订阅；已订阅则刷新时间。
 * token 一经创建不再变化，保证历史邮件中的退订链接长期有效。
 */
export async function upsertSubscription(
  db: D1Database,
  email: string,
  source: string
): Promise<{ subscription: DbSubscription; created: boolean }> {
  const now = Date.now();
  const existing = await getSubscriptionByEmail(db, email);
  if (existing) {
    await db
      .prepare(
        `UPDATE email_subscriptions
         SET unsubscribed_at = NULL, subscribed_at = ?, source = ?
         WHERE id = ?`
      )
      .bind(now, source, existing.id)
      .run();
    const refreshed = await getSubscriptionByEmail(db, email);
    return { subscription: refreshed ?? existing, created: false };
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO email_subscriptions
         (id, email, token, source, subscribed_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, email, token, source, now)
    .run();
  const subscription = await getSubscriptionByEmail(db, email);
  if (!subscription) throw new Error("Failed to create subscription");
  return { subscription, created: true };
}

/** 退订；找不到 token 时返回 false（接口层统一返回成功页，不泄露 token 存在性）。 */
export async function unsubscribeByToken(
  db: D1Database,
  token: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE email_subscriptions SET unsubscribed_at = ?
       WHERE token = ? AND unsubscribed_at IS NULL`
    )
    .bind(Date.now(), token)
    .run();
  return result.success;
}

export async function listActiveSubscriptions(
  db: D1Database
): Promise<DbSubscription[]> {
  const { results } = await db
    .prepare(
      `SELECT id, email, token, source, subscribed_at, unsubscribed_at, last_digest_date
       FROM email_subscriptions
       WHERE unsubscribed_at IS NULL
       ORDER BY subscribed_at ASC`
    )
    .all<DbSubscription>();
  return results;
}

export async function markDigestSent(
  db: D1Database,
  id: string,
  dateUtc: string
): Promise<void> {
  await db
    .prepare(`UPDATE email_subscriptions SET last_digest_date = ? WHERE id = ?`)
    .bind(dateUtc, id)
    .run();
}
