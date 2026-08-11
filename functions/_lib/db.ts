/**
 * D1 数据访问层（用户系统）。
 *
 * Binding 名为 `DB`：wrangler.toml `[[d1_databases]]` 与 Cloudflare Pages
 * 控制台的 D1 绑定需保持一致。
 */

/** 最小 D1 类型（运行时由 workerd 注入）。 */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: unknown }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

/** `users` 表行结构（migrations/0001_users.sql）。 */
export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  bio: string;
  locale: string;
  timezone: string;
  status: "active" | "disabled" | "deleted";
  role: "user" | "admin";
  stripe_customer_id: string | null;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
  /** 当前所处租户（migrations/0002_tenants.sql）。 */
  current_tenant_id: string | null;
}

export interface DbIdentity {
  provider: string;
  provider_subject: string;
  user_id: string;
  email: string | null;
  created_at: number;
}

export interface IdentityInput {
  provider: string;
  subject: string;
  email: string;
  name: string;
  picture: string;
  locale?: string;
  timezone?: string;
}

const USER_COLUMNS = `id, email, name, avatar_url, bio, locale, timezone,
  status, role, stripe_customer_id, created_at, updated_at, last_login_at,
  current_tenant_id`;

export function newUserId(): string {
  return crypto.randomUUID();
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<DbUser | null> {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .bind(id)
    .first<DbUser>();
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<DbUser | null> {
  return db
    .prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`)
    .bind(email)
    .first<DbUser>();
}

async function getIdentity(
  db: D1Database,
  provider: string,
  subject: string
): Promise<DbIdentity | null> {
  return db
    .prepare(
      `SELECT provider, provider_subject, user_id, email, created_at
       FROM user_identities
       WHERE provider = ? AND provider_subject = ?`
    )
    .bind(provider, subject)
    .first<DbIdentity>();
}

/**
 * 登录时同步基础信息：更新邮箱与最近登录时间；name/avatar 仅在用户从未
 * 设置过（空串）时用提供方数据填充，避免每次登录覆盖用户自定义资料。
 */
async function syncLoginInfo(
  db: D1Database,
  user: DbUser,
  input: IdentityInput,
  now: number
): Promise<DbUser> {
  await db
    .prepare(
      `UPDATE users
       SET email = ?,
           last_login_at = ?,
           updated_at = ?,
           name = CASE WHEN name = '' THEN ? ELSE name END,
           avatar_url = CASE WHEN avatar_url = '' THEN ? ELSE avatar_url END
       WHERE id = ?`
    )
    .bind(input.email, now, now, input.name, input.picture, user.id)
    .run();
  return (await getUserById(db, user.id)) ?? user;
}

/**
 * 按登录身份查找或创建用户：
 * 1. 身份已存在 → 复用其用户；
 * 2. 邮箱已存在 → 合并身份（同一人不同登录方式挂到同一用户）；
 * 3. 全新用户 → 创建 users + user_identities。
 */
export async function findOrCreateUserByIdentity(
  db: D1Database,
  input: IdentityInput
): Promise<DbUser> {
  const now = Date.now();
  const identity = await getIdentity(db, input.provider, input.subject);
  if (identity) {
    const user = await getUserById(db, identity.user_id);
    if (user && user.status !== "deleted") {
      return syncLoginInfo(db, user, input, now);
    }
  }

  const byEmail = await getUserByEmail(db, input.email);
  if (byEmail && byEmail.status !== "deleted") {
    await db
      .prepare(
        `INSERT OR IGNORE INTO user_identities
           (provider, provider_subject, user_id, email, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(input.provider, input.subject, byEmail.id, input.email, now)
      .run();
    return syncLoginInfo(db, byEmail, input, now);
  }

  const id = newUserId();
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO users
             (id, email, name, avatar_url, bio, locale, timezone, status,
              role, created_at, updated_at, last_login_at)
           VALUES (?, ?, ?, ?, '', ?, ?, 'active', 'user', ?, ?, ?)`
        )
        .bind(
          id,
          input.email,
          input.name,
          input.picture,
          input.locale ?? "en",
          input.timezone ?? "UTC",
          now,
          now,
          now
        ),
      db
        .prepare(
          `INSERT INTO user_identities
             (provider, provider_subject, user_id, email, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(input.provider, input.subject, id, input.email, now),
    ]);
  } catch {
    // 并发登录竞争：另一请求已插入，重新读取现成记录。
    const existingIdentity = await getIdentity(
      db,
      input.provider,
      input.subject
    );
    if (existingIdentity) {
      const existing = await getUserById(db, existingIdentity.user_id);
      if (existing) return syncLoginInfo(db, existing, input, now);
    }
    throw new Error("Failed to create user account");
  }

  const created = await getUserById(db, id);
  if (!created) throw new Error("Failed to create user account");
  return created;
}

/** 更新用户资料（只更新传入字段），返回最新记录。 */
export async function updateUserProfile(
  db: D1Database,
  id: string,
  fields: {
    name?: string;
    bio?: string;
    avatar_url?: string;
    locale?: string;
    timezone?: string;
  }
): Promise<DbUser> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of ["name", "bio", "avatar_url", "locale", "timezone"] as const) {
    const value = fields[key];
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (sets.length) {
    values.push(Date.now(), id);
    await db
      .prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...values)
      .run();
  }
  const updated = await getUserById(db, id);
  if (!updated) throw new Error("User not found");
  return updated;
}

/** 对外返回的用户资料（不暴露内部字段）。 */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  bio: string;
  locale: string;
  timezone: string;
  role: string;
  created_at: number;
  /** Phase 1 尚无套餐表，固定 free；Phase 2 改为查询 subscriptions。 */
  subscription: { plan: string; status: string };
}

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    locale: user.locale,
    timezone: user.timezone,
    role: user.role,
    created_at: user.created_at,
    subscription: { plan: "free", status: "active" },
  };
}

/** 从 Accept-Language 推断界面语言（en/zh/ja）。 */
export function detectLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "en";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("zh")) return "zh";
  if (first.startsWith("ja")) return "ja";
  return "en";
}
