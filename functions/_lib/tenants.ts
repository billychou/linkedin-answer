/**
 * D1 数据访问层（租户系统）。
 *
 * 租户 = 用户的工作区/团队。每个用户注册时自动获得一个个人租户
 * （is_personal=1），之后可创建更多租户并邀请其他已注册用户加入。
 * 站点级管理（所有用户/租户）由 users.role === 'admin' 的管理员操作。
 */

import type { D1Database, DbUser } from "./db";

/** `tenants` 表行结构（migrations/0002_tenants.sql）。 */
export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  avatar_url: string;
  plan: string;
  status: "active" | "disabled";
  is_personal: number;
  owner_id: string;
  created_at: number;
  updated_at: number;
}

/** `tenant_members` 表行结构。 */
export interface DbTenantMember {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  status: "active" | "removed";
  created_at: number;
  updated_at: number;
}

/** 用户的租户列表项：租户信息 + 成员角色 + 成员数。 */
export interface TenantWithMembership extends DbTenant {
  role: DbTenantMember["role"];
  member_count: number;
}

/** 租户成员列表项：成员关系 + 用户基础信息。 */
export interface TenantMemberUser extends DbTenantMember {
  name: string;
  email: string;
  avatar_url: string;
}

const TENANT_COLUMNS = `id, name, slug, avatar_url, plan, status,
  is_personal, owner_id, created_at, updated_at`;

export function newTenantId(): string {
  return crypto.randomUUID();
}

/** 由名称生成 URL 友好 slug；空名称回退到 "team"。 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "team";
}

export async function getTenantById(
  db: D1Database,
  id: string
): Promise<DbTenant | null> {
  return db
    .prepare(`SELECT ${TENANT_COLUMNS} FROM tenants WHERE id = ?`)
    .bind(id)
    .first<DbTenant>();
}

export async function getTenantBySlug(
  db: D1Database,
  slug: string
): Promise<DbTenant | null> {
  return db
    .prepare(`SELECT ${TENANT_COLUMNS} FROM tenants WHERE slug = ?`)
    .bind(slug)
    .first<DbTenant>();
}

/** 生成唯一 slug：冲突或空时追加随机后缀。 */
async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getTenantBySlug(db, candidate);
    if (!existing) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function getMembership(
  db: D1Database,
  tenantId: string,
  userId: string
): Promise<DbTenantMember | null> {
  return db
    .prepare(
      `SELECT tenant_id, user_id, role, status, created_at, updated_at
       FROM tenant_members WHERE tenant_id = ? AND user_id = ?`
    )
    .bind(tenantId, userId)
    .first<DbTenantMember>();
}

/** 用户的全部有效租户（按加入时间倒序），含成员角色与成员数。 */
export async function listTenantsForUser(
  db: D1Database,
  userId: string
): Promise<TenantWithMembership[]> {
  const { results } = await db
    .prepare(
      `SELECT t.id, t.name, t.slug, t.avatar_url, t.plan, t.status,
              t.is_personal, t.owner_id, t.created_at, t.updated_at,
              m.role AS role,
              (SELECT COUNT(*) FROM tenant_members m2
                WHERE m2.tenant_id = t.id AND m2.status = 'active') AS member_count
       FROM tenants t
       JOIN tenant_members m ON m.tenant_id = t.id
       WHERE m.user_id = ? AND m.status = 'active' AND t.status = 'active'
       ORDER BY m.created_at DESC`
    )
    .bind(userId)
    .all<TenantWithMembership>();
  return results;
}

export interface CreateTenantInput {
  name: string;
  ownerId: string;
  isPersonal?: boolean;
  avatarUrl?: string;
}

/** 创建租户并把创建者加为 owner 成员。 */
export async function createTenant(
  db: D1Database,
  input: CreateTenantInput
): Promise<DbTenant> {
  const now = Date.now();
  const id = newTenantId();
  const slug = await uniqueSlug(db, input.name);
  await db.batch([
    db
      .prepare(
        `INSERT INTO tenants
           (id, name, slug, avatar_url, plan, status, is_personal, owner_id,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, 'free', 'active', ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.name,
        slug,
        input.avatarUrl ?? "",
        input.isPersonal ? 1 : 0,
        input.ownerId,
        now,
        now
      ),
    db
      .prepare(
        `INSERT INTO tenant_members
           (tenant_id, user_id, role, status, created_at, updated_at)
         VALUES (?, ?, 'owner', 'active', ?, ?)`
      )
      .bind(id, input.ownerId, now, now),
  ]);
  const tenant = await getTenantById(db, id);
  if (!tenant) throw new Error("Failed to create tenant");
  return tenant;
}

/**
 * 登录时保证用户有可用租户：
 * 1. current_tenant_id 有效 → 直接复用；
 * 2. 已有个人租户（历史数据）→ 回填 current_tenant_id；
 * 3. 否则创建个人租户并设为当前租户。
 */
export async function ensureDefaultTenant(
  db: D1Database,
  user: DbUser
): Promise<DbTenant> {
  if (user.current_tenant_id) {
    const current = await getTenantById(db, user.current_tenant_id);
    const membership = current
      ? await getMembership(db, current.id, user.id)
      : null;
    if (
      current &&
      current.status === "active" &&
      membership &&
      membership.status === "active"
    ) {
      return current;
    }
  }

  const personal = await db
    .prepare(
      `SELECT ${TENANT_COLUMNS} FROM tenants
       WHERE owner_id = ? AND is_personal = 1 AND status = 'active'
       ORDER BY created_at ASC LIMIT 1`
    )
    .bind(user.id)
    .first<DbTenant>();
  if (personal) {
    await setCurrentTenant(db, user.id, personal.id);
    return personal;
  }

  const ownerName = user.name || user.email.split("@")[0] || "My";
  const tenant = await createTenant(db, {
    name: `${ownerName}'s workspace`,
    ownerId: user.id,
    isPersonal: true,
  });
  await setCurrentTenant(db, user.id, tenant.id);
  return tenant;
}

export async function setCurrentTenant(
  db: D1Database,
  userId: string,
  tenantId: string
): Promise<void> {
  await db
    .prepare(`UPDATE users SET current_tenant_id = ?, updated_at = ? WHERE id = ?`)
    .bind(tenantId, Date.now(), userId)
    .run();
}

/** 更新租户资料（只更新传入字段），返回最新记录。 */
export async function updateTenant(
  db: D1Database,
  id: string,
  fields: { name?: string; avatar_url?: string; status?: string; plan?: string }
): Promise<DbTenant> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of ["name", "avatar_url", "status", "plan"] as const) {
    const value = fields[key];
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (sets.length) {
    values.push(Date.now(), id);
    await db
      .prepare(`UPDATE tenants SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...values)
      .run();
  }
  const updated = await getTenantById(db, id);
  if (!updated) throw new Error("Tenant not found");
  return updated;
}

/** 添加成员（已存在则恢复为 active 并更新角色）。 */
export async function upsertMember(
  db: D1Database,
  tenantId: string,
  userId: string,
  role: DbTenantMember["role"]
): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO tenant_members (tenant_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?)
       ON CONFLICT (tenant_id, user_id)
       DO UPDATE SET role = ?, status = 'active', updated_at = ?`
    )
    .bind(tenantId, userId, role, now, now, role, now)
    .run();
}

export async function updateMemberRole(
  db: D1Database,
  tenantId: string,
  userId: string,
  role: DbTenantMember["role"]
): Promise<void> {
  await db
    .prepare(
      `UPDATE tenant_members SET role = ?, updated_at = ?
       WHERE tenant_id = ? AND user_id = ?`
    )
    .bind(role, Date.now(), tenantId, userId)
    .run();
}

/** 移除成员：软删除（status = removed），保留审计痕迹。 */
export async function removeMember(
  db: D1Database,
  tenantId: string,
  userId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE tenant_members SET status = 'removed', updated_at = ?
       WHERE tenant_id = ? AND user_id = ?`
    )
    .bind(Date.now(), tenantId, userId)
    .run();
}

/** 租户全部有效成员（含用户基础信息），owner 排最前。 */
export async function listMembers(
  db: D1Database,
  tenantId: string
): Promise<TenantMemberUser[]> {
  const { results } = await db
    .prepare(
      `SELECT m.tenant_id, m.user_id, m.role, m.status, m.created_at, m.updated_at,
              u.name, u.email, u.avatar_url
       FROM tenant_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.tenant_id = ? AND m.status = 'active'
       ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
                m.created_at ASC`
    )
    .bind(tenantId)
    .all<TenantMemberUser>();
  return results;
}

/** 对外返回的租户摘要（不暴露内部字段）。 */
export function toTenantSummary(tenant: TenantWithMembership) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    avatar_url: tenant.avatar_url,
    plan: tenant.plan,
    status: tenant.status,
    is_personal: tenant.is_personal === 1,
    role: tenant.role,
    member_count: tenant.member_count,
    created_at: tenant.created_at,
  };
}
