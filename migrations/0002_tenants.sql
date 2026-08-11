-- Migration 0002: 租户与成员（用户租户逻辑）
-- 设计文档：docs/user-system-design.md「租户系统」章节
--
-- 模型：
--   tenants        一个用户注册时自动获得一个个人租户（is_personal=1），
--                  之后可以创建/加入更多租户（团队工作区）。
--   tenant_members 用户与租户的多对多关系，role: owner | admin | member。
--   users.current_tenant_id 用户当前所处的租户上下文。

CREATE TABLE tenants (
  id          TEXT PRIMARY KEY,                -- 内部 UUID（crypto.randomUUID()）
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,            -- URL 友好标识，自动生成并去重
  avatar_url  TEXT NOT NULL DEFAULT '',
  plan        TEXT NOT NULL DEFAULT 'free',    -- free | pro（Phase 2 接入 Stripe）
  status      TEXT NOT NULL DEFAULT 'active',  -- active | disabled
  is_personal INTEGER NOT NULL DEFAULT 0,      -- 1 = 个人租户（注册时自动创建）
  owner_id    TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,                -- unix ms
  updated_at  INTEGER NOT NULL
);

CREATE INDEX idx_tenants_owner ON tenants(owner_id);

CREATE TABLE tenant_members (
  tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',   -- owner | admin | member
  status     TEXT NOT NULL DEFAULT 'active',   -- active | removed
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);

-- 用户当前租户（登录后由 ensureDefaultTenant 填充；可为空）
ALTER TABLE users ADD COLUMN current_tenant_id TEXT REFERENCES tenants(id);
