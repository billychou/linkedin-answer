import {
  getSessionToken,
  jsonResponse,
  sessionCookieHeader,
  verifySessionToken,
  type AuthEnv,
} from "../../_lib/auth";
import { getSubscriptionSummary, getUsableSubscription } from "../../_lib/billing";
import {
  getUserById,
  toPublicUser,
  updateUserProfile,
} from "../../_lib/db";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import { listTenantsForUser, toTenantSummary } from "../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
}

/** IANA 时区校验：利用 Intl 构造失败来判断。 */
function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(50),
    bio: z.string().trim().max(500),
    avatar_url: z.union([
      z.literal(""),
      z
        .string()
        .url("Avatar must be a valid URL")
        .refine((url) => url.startsWith("https://"), "Avatar must be https"),
    ]),
    locale: z.enum(["en", "zh", "ja"]),
    timezone: z.string().refine(isValidTimezone, "Invalid timezone"),
  })
  .strict() // 拒绝未知字段
  .partial(); // 允许只更新其中一部分

/**
 * GET    /api/me  — 当前登录用户完整资料
 * PATCH  /api/me  — 更新资料（name/bio/avatar_url/locale/timezone）
 * DELETE /api/me  — 注销账号（GDPR：软删除 + 匿名化 PII）
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (
    request.method !== "GET" &&
    request.method !== "PATCH" &&
    request.method !== "DELETE"
  ) {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const user = await getUserById(env.DB, session.id);
  if (!user || user.status !== "active") {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (request.method === "GET") {
    const tenants = await listTenantsForUser(env.DB, user.id);
    const subscription = await getSubscriptionSummary(env.DB, user.id);
    return jsonResponse({
      user: {
        ...toPublicUser(user, subscription),
        current_tenant_id: user.current_tenant_id,
        tenants: tenants.map(toTenantSummary),
      },
    });
  }

  if (request.method === "DELETE") {
    return handleDelete(request, env, user.id);
  }

  // 防刷：同一 IP 每小时最多 60 次资料更新。
  const limited = await rateLimitOr429(env, request, "me/patch", 60, 3600);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return jsonResponse({ error: "Invalid input", issues }, 400);
  }

  const updated = await updateUserProfile(env.DB, user.id, parsed.data);
  return jsonResponse({ user: toPublicUser(updated) });
};


/**
 * 注销账号（软删除 + PII 匿名化）：
 * - 有生效中的付费订阅时拒绝（需先在 Billing Portal 取消）；
 * - users 行保留（业务外键完整）但匿名化 email/name/bio/avatar；
 * - 删除第三方身份、软移除全部租户成员关系、停用名下租户；
 * - 清理会话 Cookie。
 */
async function handleDelete(
  request: Request,
  env: AuthEnv,
  userId: string
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const confirmation = (body as { confirmation?: string }).confirmation;
  if (confirmation !== "DELETE") {
    return jsonResponse(
      { error: 'Body must be { "confirmation": "DELETE" }' },
      400
    );
  }

  const db = env.DB!;
  const activeSub = await getUsableSubscription(db, userId);
  if (activeSub && activeSub.status !== "canceled") {
    return jsonResponse(
      {
        error:
          "You have an active subscription. Please cancel it in billing settings before deleting your account.",
      },
      409
    );
  }

  const now = Date.now();
  const anonymizedEmail = `deleted-${userId.slice(0, 8)}@invalid`;
  await db.batch([
    db
      .prepare(
        `UPDATE users
         SET email = ?, name = '', bio = '', avatar_url = '',
             stripe_customer_id = NULL, status = 'deleted', updated_at = ?
         WHERE id = ?`
      )
      .bind(anonymizedEmail, now, userId),
    db
      .prepare(`DELETE FROM user_identities WHERE user_id = ?`)
      .bind(userId),
    db
      .prepare(
        `UPDATE tenant_members SET status = 'removed', updated_at = ?
         WHERE user_id = ?`
      )
      .bind(now, userId),
    // 名下租户一并停用（骨架实现：团队租户应先转让所有权，见 docs）。
    db
      .prepare(
        `UPDATE tenants SET status = 'disabled', updated_at = ?
         WHERE owner_id = ?`
      )
      .bind(now, userId),
  ]);

  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": sessionCookieHeader(null),
  });
}
