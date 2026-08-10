-- Migration 0001: 用户与身份（Phase 1）
-- 设计文档：docs/user-system-design.md

CREATE TABLE users (
  id                  TEXT PRIMARY KEY,                -- 内部 UUID（crypto.randomUUID()）
  email               TEXT NOT NULL UNIQUE,            -- 统一小写
  name                TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT NOT NULL DEFAULT '',
  bio                 TEXT NOT NULL DEFAULT '',
  locale              TEXT NOT NULL DEFAULT 'en',      -- 界面语言 en/zh/ja
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  status              TEXT NOT NULL DEFAULT 'active',  -- active | disabled | deleted
  role                TEXT NOT NULL DEFAULT 'user',    -- user | admin
  stripe_customer_id  TEXT UNIQUE,                     -- Phase 2 由 Stripe 填充
  created_at          INTEGER NOT NULL,                -- unix ms
  updated_at          INTEGER NOT NULL,
  last_login_at       INTEGER
);

CREATE TABLE user_identities (
  provider          TEXT NOT NULL,      -- 'google' | 'dev' | 'password' | 'apple' ...
  provider_subject  TEXT NOT NULL,      -- 各提供方的用户 ID
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email             TEXT,
  created_at        INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_subject)
);

CREATE INDEX idx_identities_user ON user_identities(user_id);
