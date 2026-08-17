/**
 * D1 数据访问层（计费系统，migration 0003）。
 *
 * 原则（见 docs/user-system-design.md §3.3）：
 * - Stripe 是账本，D1 是业务状态；订阅/发票一律由 Webhook 驱动写入。
 * - 前端不信任 Stripe 返回值，只信任 /api/me、/api/billing/* 的查库结果。
 * - webhook_events 以事件 ID 唯一约束保证幂等。
 */

import type { D1Database, DbUser } from "./db";
import type {
  StripeEnv,
  StripeInvoice,
  StripeSubscription,
} from "./stripe";
import {
  createCustomer,
  subscriptionPeriod,
  subscriptionPriceId,
} from "./stripe";

// ---------------------------------------------------------------------------
// 表结构
// ---------------------------------------------------------------------------

export interface DbPlan {
  id: string;
  name: string;
  billing_interval: "none" | "month" | "year";
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  features_json: string;
  sort_order: number;
  is_active: number;
}

export interface DbSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: number;
  stripe_subscription_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface DbInvoice {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  paid_at: number | null;
  created_at: number;
}

/** 视为"可用"的订阅状态（canceled 在期末前仍可用，单独判断）。 */
const USABLE_SUB_STATUSES = new Set(["trialing", "active", "past_due"]);

// ---------------------------------------------------------------------------
// plans
// ---------------------------------------------------------------------------

const PLAN_COLUMNS = `id, name, billing_interval, price_cents, currency,
  stripe_price_id, features_json, sort_order, is_active`;

export async function listActivePlans(db: D1Database): Promise<DbPlan[]> {
  const { results } = await db
    .prepare(
      `SELECT ${PLAN_COLUMNS} FROM plans WHERE is_active = 1 ORDER BY sort_order`
    )
    .all<DbPlan>();
  return results;
}

export async function getPlanById(
  db: D1Database,
  id: string
): Promise<DbPlan | null> {
  return db
    .prepare(`SELECT ${PLAN_COLUMNS} FROM plans WHERE id = ?`)
    .bind(id)
    .first<DbPlan>();
}

export async function getPlanByStripePriceId(
  db: D1Database,
  priceId: string
): Promise<DbPlan | null> {
  return db
    .prepare(`SELECT ${PLAN_COLUMNS} FROM plans WHERE stripe_price_id = ?`)
    .bind(priceId)
    .first<DbPlan>();
}

export interface PlanFeatures {
  chatPerDay: number;
  historyDays: number;
  priority?: boolean;
}

export function parsePlanFeatures(plan: DbPlan | null): PlanFeatures {
  const fallback: PlanFeatures = { chatPerDay: 5, historyDays: 7 };
  if (!plan) return fallback;
  try {
    const parsed = JSON.parse(plan.features_json) as Partial<PlanFeatures>;
    return {
      chatPerDay:
        typeof parsed.chatPerDay === "number" ? parsed.chatPerDay : 5,
      historyDays:
        typeof parsed.historyDays === "number" ? parsed.historyDays : 7,
      priority: Boolean(parsed.priority),
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// subscriptions
// ---------------------------------------------------------------------------

const SUB_COLUMNS = `id, user_id, plan_id, status, current_period_start,
  current_period_end, cancel_at_period_end, stripe_subscription_id,
  created_at, updated_at`;

/** 用户当前生效订阅（usable 状态且未过期末）。无则 null。 */
export async function getUsableSubscription(
  db: D1Database,
  userId: string
): Promise<DbSubscription | null> {
  const now = Date.now();
  const row = await db
    .prepare(
      `SELECT ${SUB_COLUMNS} FROM subscriptions
       WHERE user_id = ? AND current_period_end > ?
       ORDER BY updated_at DESC LIMIT 1`
    )
    .bind(userId, now)
    .first<DbSubscription>();
  if (!row) return null;
  return USABLE_SUB_STATUSES.has(row.status) ? row : null;
}

export async function getSubscriptionByStripeId(
  db: D1Database,
  stripeSubscriptionId: string
): Promise<DbSubscription | null> {
  return db
    .prepare(
      `SELECT ${SUB_COLUMNS} FROM subscriptions WHERE stripe_subscription_id = ?`
    )
    .bind(stripeSubscriptionId)
    .first<DbSubscription>();
}

export async function listInvoicesForUser(
  db: D1Database,
  userId: string
): Promise<DbInvoice[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_id, subscription_id, stripe_invoice_id, amount_cents,
              currency, status, hosted_invoice_url, paid_at, created_at
       FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(userId)
    .all<DbInvoice>();
  return results;
}

/**
 * 由 Stripe 订阅对象同步本地订阅行（upsert，按 stripe_subscription_id）。
 * Price 无法匹配本地套餐时返回 null（调用方记录日志并跳过）。
 */
export async function syncSubscriptionFromStripe(
  db: D1Database,
  user: DbUser,
  sub: StripeSubscription
): Promise<DbSubscription | null> {
  const priceId = subscriptionPriceId(sub);
  const plan = priceId ? await getPlanByStripePriceId(db, priceId) : null;
  if (!plan) return null;

  const { start, end } = subscriptionPeriod(sub);
  const now = Date.now();
  const existing = await getSubscriptionByStripeId(db, sub.id);

  if (existing) {
    await db
      .prepare(
        `UPDATE subscriptions
         SET plan_id = ?, status = ?, current_period_start = ?,
             current_period_end = ?, cancel_at_period_end = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        plan.id,
        sub.status,
        start * 1000,
        end * 1000,
        sub.cancel_at_period_end ? 1 : 0,
        now,
        existing.id
      )
      .run();
    return { ...existing, plan_id: plan.id, status: sub.status };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO subscriptions
        (id, user_id, plan_id, status, current_period_start,
         current_period_end, cancel_at_period_end, stripe_subscription_id,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      plan.id,
      sub.status,
      start * 1000,
      end * 1000,
      sub.cancel_at_period_end ? 1 : 0,
      sub.id,
      now,
      now
    )
    .run();
  return {
    id,
    user_id: user.id,
    plan_id: plan.id,
    status: sub.status,
    current_period_start: start * 1000,
    current_period_end: end * 1000,
    cancel_at_period_end: sub.cancel_at_period_end ? 1 : 0,
    stripe_subscription_id: sub.id,
    created_at: now,
    updated_at: now,
  };
}

/** invoice.paid / invoice.payment_failed 落账（stripe_invoice_id 幂等）。 */
export async function recordInvoiceFromStripe(
  db: D1Database,
  userId: string,
  subscriptionId: string | null,
  invoice: StripeInvoice
): Promise<void> {
  const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
  await db
    .prepare(
      `INSERT INTO invoices
        (id, user_id, subscription_id, stripe_invoice_id, amount_cents,
         currency, status, hosted_invoice_url, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_invoice_id) DO UPDATE SET
         status = excluded.status,
         paid_at = excluded.paid_at,
         hosted_invoice_url = excluded.hosted_invoice_url`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      subscriptionId,
      invoice.id,
      amount,
      invoice.currency,
      invoice.status,
      invoice.hosted_invoice_url ?? null,
      invoice.paid_at ? invoice.paid_at * 1000 : null,
      invoice.created * 1000
    )
    .run();
}

// ---------------------------------------------------------------------------
// webhook 幂等
// ---------------------------------------------------------------------------

/**
 * 记录事件；返回 false 表示已处理过（重复投递），调用方应直接跳过。
 */
export async function claimWebhookEvent(
  db: D1Database,
  eventId: string,
  type: string,
  payload: string
): Promise<boolean> {
  try {
    await db
      .prepare(
        `INSERT INTO webhook_events (stripe_event_id, type, payload, processed_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(eventId, type, payload, Date.now())
      .run();
    return true;
  } catch {
    // UNIQUE 冲突（或其他写入错误）→ 保守视为已处理。
    return false;
  }
}

// ---------------------------------------------------------------------------
// 客户与权益
// ---------------------------------------------------------------------------

/** 取（或创建并落库）用户的 Stripe Customer ID。 */
export async function getOrCreateStripeCustomer(
  env: StripeEnv & { DB: D1Database },
  user: DbUser
): Promise<string> {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await createCustomer(env, {
    email: user.email,
    name: user.name || undefined,
    userId: user.id,
  });
  await env.DB.prepare(
    `UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?`
  )
    .bind(customer.id, Date.now(), user.id)
    .run();
  return customer.id;
}

export async function getUserByStripeCustomer(
  db: D1Database,
  customerId: string
): Promise<DbUser | null> {
  return db
    .prepare(
      `SELECT id, email, name, avatar_url, bio, locale, timezone, status,
              role, stripe_customer_id, created_at, updated_at,
              last_login_at, current_tenant_id
       FROM users WHERE stripe_customer_id = ?`
    )
    .bind(customerId)
    .first<DbUser>();
}

export interface Entitlements {
  planId: string;
  planName: string;
  /** 'free'（无订阅）或订阅状态（active/past_due/...）。 */
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  features: PlanFeatures;
}

/**
 * 功能闸门唯一入口：按当前订阅解析用户权益。
 * 无可用订阅 → free 套餐；API 入口处校验，禁止在页面里写死权限。
 */
export async function getEntitlements(
  db: D1Database,
  userId: string
): Promise<Entitlements> {
  const sub = await getUsableSubscription(db, userId);
  const plan = sub
    ? await getPlanById(db, sub.plan_id)
    : await getPlanById(db, "free");
  return {
    planId: plan?.id ?? "free",
    planName: plan?.name ?? "Free",
    status: sub ? sub.status : "free",
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
    currentPeriodEnd: sub ? sub.current_period_end : null,
    features: parsePlanFeatures(plan),
  };
}

/** /api/me 用的轻量订阅摘要。 */
export async function getSubscriptionSummary(
  db: D1Database,
  userId: string
): Promise<{ plan: string; status: string }> {
  const ent = await getEntitlements(db, userId);
  return { plan: ent.planId, status: ent.status };
}
