export interface GoogleUser {
  /** 内部用户 ID（users.id）。Phase 1 起由服务端会话接口返回。 */
  id?: string;
  name: string;
  email: string;
  picture: string;
  /** 会话缓存的角色（仅用于 UI 展示，权限以服务端查库为准）。 */
  role?: "user" | "admin";
  /** Google ID token expiry in seconds since epoch (0 = unknown). */
  exp: number;
}

import type { TenantSummary } from "@/types/tenant";

/** `/api/me` 返回的完整用户资料。 */
export interface ProfileUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  bio: string;
  locale: "en" | "zh" | "ja";
  timezone: string;
  role: "user" | "admin";
  created_at: number;
  subscription: { plan: string; status: string };
  /** 当前所处租户 ID（租户系统，migration 0002）。 */
  current_tenant_id: string | null;
  /** 用户所属的全部租户（含角色与成员数）。 */
  tenants: TenantSummary[];
}

/** PATCH /api/me 允许更新的字段。 */
export type ProfilePatch = Partial<
  Pick<ProfileUser, "name" | "bio" | "avatar_url" | "locale" | "timezone">
>;
