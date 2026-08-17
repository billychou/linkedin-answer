-- Migration 0003: 订阅与计费（Phase 2 · Stripe）
-- 设计文档：docs/user-system-design.md §3.3 / §4
--
-- 模型：
--   plans           套餐目录（代码内 seed，Stripe 侧通过 stripe_price_id 关联）。
--   subscriptions   当前订阅状态，仅由 Stripe Webhook 驱动写入。
--   invoices        发票账本（invoice.paid / invoice.payment_failed）。
--   webhook_events  Stripe 事件幂等表（事件 ID 唯一约束）。
--   usage_daily     按日用量计数（chat 配额等功能闸门）。

CREATE TABLE plans (
  id                TEXT PRIMARY KEY,   -- 'free' | 'pro_monthly' | 'pro_yearly'
  name              TEXT NOT NULL,
  billing_interval  TEXT NOT NULL,      -- 'none' | 'month' | 'year'
  price_cents       INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'usd',
  stripe_price_id   TEXT,               -- Stripe Price ID（free 为空）
  features_json     TEXT NOT NULL DEFAULT '{}',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1
);

INSERT INTO plans (id, name, billing_interval, price_cents, currency, stripe_price_id, features_json, sort_order, is_active) VALUES
  ('free',        'Free',        'none',  0,    'usd', NULL, '{"chatPerDay":5,"historyDays":7}',                        0, 1),
  ('pro_monthly', 'Pro Monthly', 'month', 599,  'usd', NULL, '{"chatPerDay":100,"historyDays":365,"priority":true}',    1, 1),
  ('pro_yearly',  'Pro Yearly',  'year',  4990, 'usd', NULL, '{"chatPerDay":100,"historyDays":365,"priority":true}',    2, 1);

CREATE TABLE subscriptions (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL REFERENCES plans(id),
  status                 TEXT NOT NULL,  -- trialing | active | past_due | canceled | expired
  current_period_start   INTEGER NOT NULL,
  current_period_end     INTEGER NOT NULL,
  cancel_at_period_end   INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_id TEXT UNIQUE,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);

CREATE INDEX idx_subs_user ON subscriptions(user_id, status);

CREATE TABLE invoices (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id    TEXT REFERENCES subscriptions(id),
  stripe_invoice_id  TEXT UNIQUE,
  amount_cents       INTEGER NOT NULL,
  currency           TEXT NOT NULL,
  status             TEXT NOT NULL,   -- open | paid | void | uncollectible
  hosted_invoice_url TEXT,
  paid_at            INTEGER,
  created_at         INTEGER NOT NULL
);

CREATE INDEX idx_invoices_user ON invoices(user_id);

CREATE TABLE webhook_events (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id  TEXT UNIQUE NOT NULL,   -- 幂等：重试/重复投递只处理一次
  type             TEXT NOT NULL,
  payload          TEXT NOT NULL,
  processed_at     INTEGER
);

CREATE TABLE usage_daily (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,   -- 用户时区下的 YYYY-MM-DD
  metric   TEXT NOT NULL,   -- 'chat'
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date, metric)
);
