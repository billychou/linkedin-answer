import type {
  AdminTenantRow,
  AdminUserRow,
  TenantDetail,
  TenantInvite,
  TenantMember,
  TenantSummary,
} from "@/types/tenant";

/**
 * Client helpers for the tenant system (Cloudflare Pages Functions).
 * All calls hit /api/* endpoints; failures return null so the UI can show
 * a toast and keep previous state.
 */

async function json<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** 创建租户；成功后返回新租户。 */
export async function createTenant(
  name: string
): Promise<TenantSummary | null> {
  try {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await json<{ tenant: TenantSummary }>(res);
    return data?.tenant ?? null;
  } catch {
    return null;
  }
}

/** 切换当前租户。 */
export async function switchTenant(tenantId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/switch`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 更新租户资料（名称/头像）。 */
export async function updateTenant(
  tenantId: string,
  patch: { name?: string; avatar_url?: string }
): Promise<TenantSummary | null> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await json<{ tenant: TenantSummary }>(res);
    return data?.tenant ?? null;
  } catch {
    return null;
  }
}

/** 获取租户详情（含成员）。 */
export async function fetchTenantDetail(
  tenantId: string
): Promise<TenantDetail | null> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}`);
    return await json<TenantDetail>(res);
  } catch {
    return null;
  }
}

/** 按邮箱添加成员。成功返回最新成员列表。 */
export async function addTenantMember(
  tenantId: string,
  email: string,
  role: "member" | "admin" = "member"
): Promise<{ members: TenantMember[] | null; error: string | null }> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return { members: null, error: data?.error ?? "Failed to add member" };
    }
    const data = (await res.json()) as { members: TenantMember[] };
    return { members: data.members, error: null };
  } catch {
    return { members: null, error: "Network error" };
  }
}

/** 调整成员角色（仅 owner）。 */
export async function updateTenantMemberRole(
  tenantId: string,
  userId: string,
  role: "admin" | "member"
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 移除成员 / 退出租户。 */
export async function removeTenantMember(
  tenantId: string,
  userId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/members/${userId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------- 管理后台（role=admin） ------------------------- */

/** 用户列表（支持按邮箱/名称搜索）。 */
export async function adminListUsers(
  search = ""
): Promise<{ users: AdminUserRow[]; total: number } | null> {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    return await json<{ users: AdminUserRow[]; total: number }>(res);
  } catch {
    return null;
  }
}

/** 更新用户角色/状态。 */
export async function adminUpdateUser(
  userId: string,
  patch: { role?: "user" | "admin"; status?: "active" | "disabled" }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 租户列表（支持搜索）。 */
export async function adminListTenants(
  search = ""
): Promise<{ tenants: AdminTenantRow[]; total: number } | null> {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/tenants?${params.toString()}`);
    return await json<{ tenants: AdminTenantRow[]; total: number }>(res);
  } catch {
    return null;
  }
}

/** 更新租户状态/套餐/名称。 */
export async function adminUpdateTenant(
  tenantId: string,
  patch: { name?: string; status?: "active" | "disabled"; plan?: "free" | "pro" }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 邮件邀请（Phase 1 协作补全，migration 0004）
// ---------------------------------------------------------------------------

/** 待处理邀请列表。 */
export async function fetchTenantInvites(
  tenantId: string
): Promise<TenantInvite[] | null> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/invites`);
    const data = await json<{ invites: TenantInvite[] }>(res);
    return data?.invites ?? null;
  } catch {
    return null;
  }
}

export interface CreateInviteResult {
  invite?: TenantInvite;
  email_sent?: boolean;
  error?: string;
}

/** 创建邀请并发送邮件；同邮箱重复调用 = 撤销旧邀请并重发。 */
export async function createTenantInvite(
  tenantId: string,
  email: string,
  role: "member" | "admin"
): Promise<CreateInviteResult> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = (await res.json().catch(() => null)) as CreateInviteResult | null;
    if (!res.ok) {
      return { error: data?.error ?? `Request failed (${res.status})` };
    }
    return data ?? {};
  } catch {
    return { error: "Network error" };
  }
}

/** 撤销待处理邀请。 */
export async function revokeTenantInvite(
  tenantId: string,
  inviteId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenants/${tenantId}/invites/${inviteId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}
