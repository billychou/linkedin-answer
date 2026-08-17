-- Migration 0004: 租户邮件邀请（Phase 1 协作补全）
-- 设计：邀请不再要求对方已注册；被邀请人通过邮件中的
-- /invites/accept?token=... 链接（需登录）接受邀请加入租户。

CREATE TABLE tenant_invites (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,               -- 统一小写
  role        TEXT NOT NULL DEFAULT 'member',  -- member | admin
  token       TEXT NOT NULL UNIQUE,        -- 32 字节随机，URL 安全
  invited_by  TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | revoked | expired
  expires_at  INTEGER NOT NULL,            -- unix ms，默认 7 天
  accepted_at INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_invites_tenant ON tenant_invites(tenant_id, status);
CREATE INDEX idx_invites_email ON tenant_invites(email);
