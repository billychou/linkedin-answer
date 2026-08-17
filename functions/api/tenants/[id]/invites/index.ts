import {
  getRequestUser,
  jsonResponse,
  siteBaseUrl,
  type AuthEnv,
} from "../../../../_lib/auth";
import { getUserByEmail } from "../../../../_lib/db";
import { sendEmail, type EmailEnv } from "../../../../_lib/email";
import { tenantInviteEmail } from "../../../../_lib/emailTemplates";
import {
  createInvite,
  INVITE_TTL_MS,
  listPendingInvites,
  toPublicInvite,
} from "../../../../_lib/invites";
import { rateLimitOr429 } from "../../../../_lib/rateLimit";
import {
  getMembership,
  getTenantById,
} from "../../../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv & EmailEnv;
  params: { id: string };
}

const createSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email"),
    role: z.enum(["member", "admin"]).default("member"),
  })
  .strict();

/**
 * GET  /api/tenants/:id/invites — 待处理邀请列表（owner/admin）
 * POST /api/tenants/:id/invites — 按邮箱创建邀请并发送邀请邮件
 *
 * 与旧的 POST /members（仅能添加已注册用户）不同，邀请对未注册用户开放：
 * 对方通过邮件链接 /invites/accept?token=... 登录后接受。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const { user } = auth;

  const tenant = await getTenantById(env.DB, params.id);
  if (!tenant || tenant.status !== "active") {
    return jsonResponse({ error: "Tenant not found" }, 404);
  }
  const membership = await getMembership(env.DB, tenant.id, user.id);
  if (!membership || membership.status !== "active") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (request.method === "GET") {
    const invites = await listPendingInvites(env.DB, tenant.id);
    return jsonResponse({ invites: invites.map(toPublicInvite) });
  }

  const limited = await rateLimitOr429(env, request, "tenants/invite", 30, 3600);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return jsonResponse({ error: "Invalid input", issues }, 400);
  }

  // 与成员管理规则一致：仅 owner 可授予 admin。
  if (parsed.data.role === "admin" && membership.role !== "owner") {
    return jsonResponse({ error: "Only the owner can invite admins" }, 403);
  }

  // 已是活跃成员 → 无需邀请。
  const existingUser = await getUserByEmail(env.DB, parsed.data.email);
  if (existingUser) {
    const existingMembership = await getMembership(
      env.DB,
      tenant.id,
      existingUser.id
    );
    if (existingMembership && existingMembership.status === "active") {
      return jsonResponse({ error: "User is already a member" }, 409);
    }
  }

  const invite = await createInvite(env.DB, {
    tenantId: tenant.id,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedBy: user.id,
  });

  // 邮件发送失败不阻断：邀请已创建，可在列表中重发（再次 POST 同邮箱）。
  const inviteUrl = `${siteBaseUrl(env, request)}/invites/accept?token=${invite.token}`;
  const email = tenantInviteEmail({
    tenantName: tenant.name,
    inviterName: user.name || user.email,
    inviteUrl,
    expiresDays: Math.round(INVITE_TTL_MS / (24 * 60 * 60 * 1000)),
  });
  const emailSent = await sendEmail(env, {
    to: invite.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return jsonResponse({ invite: toPublicInvite(invite), email_sent: emailSent }, 201);
};
