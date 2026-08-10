export interface GoogleUser {
  /** 内部用户 ID（users.id）。Phase 1 起由服务端会话接口返回。 */
  id?: string;
  name: string;
  email: string;
  picture: string;
  /** Google ID token expiry in seconds since epoch (0 = unknown). */
  exp: number;
}

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
}

/** PATCH /api/me 允许更新的字段。 */
export type ProfilePatch = Partial<
  Pick<ProfileUser, "name" | "bio" | "avatar_url" | "locale" | "timezone">
>;
