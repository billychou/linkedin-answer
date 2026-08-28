-- Migration 0007: 邮件订阅（回访通道）
-- - email_subscriptions：匿名邮件订阅（不依赖登录用户）
-- - token：退订链接使用的不可猜测令牌
-- - last_digest_date：每日摘要去重（UTC 日期，防止同日重复发送）

CREATE TABLE email_subscriptions (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL COLLATE NOCASE,
  token            TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'footer',
  subscribed_at    INTEGER NOT NULL,
  unsubscribed_at  INTEGER,
  last_digest_date TEXT
);

CREATE UNIQUE INDEX idx_email_subscriptions_email
  ON email_subscriptions(email);

CREATE INDEX idx_email_subscriptions_token
  ON email_subscriptions(token);
