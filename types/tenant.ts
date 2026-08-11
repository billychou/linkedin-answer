/** 租户成员角色。 */
export type TenantRole = "owner" | "admin" | "member";

/** `/api/me` 与 `/api/tenants` 返回的租户摘要。 */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  avatar_url: string;
  plan: string;
  status: "active" | "disabled";
  /** 是否个人租户（注册时自动创建）。 */
  is_personal: boolean;
  /** 当前用户在该租户中的角色。 */
  role: TenantRole;
  member_count: number;
  created_at: number;
}

/** 租户成员（含用户基础信息）。 */
export interface TenantMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: TenantRole;
  joined_at: number;
}

/** `/api/tenants/:id` 返回的详情。 */
export interface TenantDetail {
  tenant: TenantSummary;
  members: TenantMember[];
}

/** 管理后台：用户行。 */
export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  status: "active" | "disabled" | "deleted";
  role: "user" | "admin";
  created_at: number;
  last_login_at: number | null;
  tenant_name: string | null;
  tenant_count: number;
}

/** 管理后台：租户行。 */
export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "disabled";
  is_personal: boolean;
  owner_id: string;
  owner_email: string;
  member_count: number;
  created_at: number;
}
