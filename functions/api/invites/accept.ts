import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { claimInvite, getInviteByToken } from "../../_lib/invites";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import {
  getMembership,
  getTenantById,
  setCurrentTenant,
  upsertMember,
} from "../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
}

const bodySchema = z.object({ token: z.string().min(16).max(128) }).strict();

/**
 * POST /api/invites/accept { token } — 接受租户邀请。
 *
 * 规则：
 * - 需要登录（/invites 在 middleware 受保护路径中，未登录先去 /login）；
 * - 登录邮箱必须与邀请邮箱一致；
 * - 邀请必须 pending 且未过期；接受成功后 upsert 成员并切换当前租户；
 * - claimInvite 原子更新防止并发双花；已是成员时视为成功（幂等）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const limited = await rateLimitOr429(env, request, "invites/accept", 20, 3600);
  if (limited) return limited;

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const { user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid token" }, 400);
  }

  const invite = await getInviteByToken(env.DB, parsed.data.token);
  if (!invite) {
    return jsonResponse({ error: "Invitation not found" }, 404);
  }
  if (invite.status === "revoked") {
    return jsonResponse({ error: "This invitation has been revoked" }, 410);
  }
  if (invite.status === "accepted") {
    return jsonResponse({ error: "This invitation was already used" }, 410);
  }
  if (invite.status !== "pending" || invite.expires_at <= Date.now()) {
    return jsonResponse({ error: "This invitation has expired" }, 410);
  }
  if (invite.email !== user.email) {
    return jsonResponse(
      {
        error: `This invitation was sent to ${invite.email}. Sign in with that email to accept it.`,
      },
      403
    );
  }

  const tenant = await getTenantById(env.DB, invite.tenant_id);
  if (!tenant || tenant.status !== "active") {
    return jsonResponse({ error: "This workspace is no longer available" }, 410);
  }

  const claimed = await claimInvite(env.DB, invite.id);
  if (!claimed) {
    // 并发下已被接受；只要成员关系在，就视为成功。
    const existing = await getMembership(env.DB, tenant.id, user.id);
    if (!existing || existing.status !== "active") {
      return jsonResponse({ error: "This invitation was already used" }, 410);
    }
  }

  await upsertMember(env.DB, tenant.id, user.id, invite.role);
  // 接受后直接切入该工作区，减少一步手动切换。
  await setCurrentTenant(env.DB, user.id, tenant.id);

  return jsonResponse({
    ok: true,
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
  });
};
