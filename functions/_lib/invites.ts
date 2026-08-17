/**
 * D1 数据访问层（租户邮件邀请，migration 0004）。
 *
 * 邀请不再要求对方已注册：owner/admin 按邮箱创建邀请 → 发邮件 →
 * 被邀请人登录后访问 /invites/accept?token=... 接受并加入租户。
 */

import type { D1Database } from "./db";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export interface DbTenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: "member" | "admin";
  token: string;
  invited_by: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: number;
  accepted_at: number | null;
  created_at: number;
  updated_at: number;
}

const INVITE_COLUMNS = `id, tenant_id, email, role, token, invited_by,
  status, expires_at, accepted_at, created_at, updated_at`;

/** 32 字节随机 → URL 安全 base64（约 43 字符，不可猜测）。 */
export function newInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getInviteByToken(
  db: D1Database,
  token: string
): Promise<DbTenantInvite | null> {
  return db
    .prepare(`SELECT ${INVITE_COLUMNS} FROM tenant_invites WHERE token = ?`)
    .bind(token)
    .first<DbTenantInvite>();
}

/** 租户内某邮箱的待处理邀请（同租户同邮箱至多一条 pending）。 */
export async function getPendingInvite(
  db: D1Database,
  tenantId: string,
  email: string
): Promise<DbTenantInvite | null> {
  return db
    .prepare(
      `SELECT ${INVITE_COLUMNS} FROM tenant_invites
       WHERE tenant_id = ? AND email = ? AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(tenantId, email, Date.now())
    .first<DbTenantInvite>();
}

export async function listPendingInvites(
  db: D1Database,
  tenantId: string
): Promise<DbTenantInvite[]> {
  const { results } = await db
    .prepare(
      `SELECT ${INVITE_COLUMNS} FROM tenant_invites
       WHERE tenant_id = ? AND status = 'pending' AND expires_at > ?
       ORDER BY created_at DESC`
    )
    .bind(tenantId, Date.now())
    .all<DbTenantInvite>();
  return results;
}

/** 创建邀请；同邮箱已有 pending 时先撤销旧的（相当于"重新发送"）。 */
export async function createInvite(
  db: D1Database,
  input: {
    tenantId: string;
    email: string;
    role: "member" | "admin";
    invitedBy: string;
  }
): Promise<DbTenantInvite> {
  const now = Date.now();
  const existing = await getPendingInvite(db, input.tenantId, input.email);
  if (existing) {
    await db
      .prepare(
        `UPDATE tenant_invites SET status = 'revoked', updated_at = ? WHERE id = ?`
      )
      .bind(now, existing.id)
      .run();
  }

  const invite: DbTenantInvite = {
    id: crypto.randomUUID(),
    tenant_id: input.tenantId,
    email: input.email,
    role: input.role,
    token: newInviteToken(),
    invited_by: input.invitedBy,
    status: "pending",
    expires_at: now + INVITE_TTL_MS,
    accepted_at: null,
    created_at: now,
    updated_at: now,
  };
  await db
    .prepare(
      `INSERT INTO tenant_invites
        (id, tenant_id, email, role, token, invited_by, status,
         expires_at, accepted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      invite.id,
      invite.tenant_id,
      invite.email,
      invite.role,
      invite.token,
      invite.invited_by,
      invite.status,
      invite.expires_at,
      invite.accepted_at,
      invite.created_at,
      invite.updated_at
    )
    .run();
  return invite;
}

export async function revokeInvite(
  db: D1Database,
  tenantId: string,
  inviteId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE tenant_invites
       SET status = 'revoked', updated_at = ?
       WHERE tenant_id = ? AND id = ? AND status = 'pending'`
    )
    .bind(Date.now(), tenantId, inviteId)
    .run();
  const meta = result as unknown as { meta?: { changes?: number } };
  return (meta.meta?.changes ?? 0) > 0;
}

/** 接受邀请：原子地把 pending 置为 accepted（防并发双花）。 */
export async function claimInvite(
  db: D1Database,
  inviteId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE tenant_invites
       SET status = 'accepted', accepted_at = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`
    )
    .bind(Date.now(), Date.now(), inviteId)
    .run();
  const meta = result as unknown as { meta?: { changes?: number } };
  return (meta.meta?.changes ?? 0) > 0;
}

export function toPublicInvite(invite: DbTenantInvite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  };
}
