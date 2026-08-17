import { getRequestUser, jsonResponse, type AuthEnv } from "../../../../_lib/auth";
import { getUserByEmail } from "../../../../_lib/db";
import {
  getMembership,
  getTenantById,
  listMembers,
  upsertMember,
} from "../../../../_lib/tenants";
import { rateLimitOr429 } from "../../../../_lib/rateLimit";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string };
}

const addSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email"),
    // admin 角色仅 owner 可以授予（见下方校验）。
    role: z.enum(["member", "admin"]).default("member"),
  })
  .strict();

/**
 * GET  /api/tenants/:id/members — 成员列表（仅限成员）
 * POST /api/tenants/:id/members — 按邮箱添加成员（仅限 owner/admin）
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
  if (!tenant) {
    return jsonResponse({ error: "Tenant not found" }, 404);
  }
  const membership = await getMembership(env.DB, tenant.id, user.id);
  if (!membership || membership.status !== "active") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (request.method === "GET") {
    const members = await listMembers(env.DB, tenant.id);
    return jsonResponse({
      members: members.map((member) => ({
        id: member.user_id,
        name: member.name,
        email: member.email,
        avatar_url: member.avatar_url,
        role: member.role,
        joined_at: member.created_at,
      })),
    });
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // 防刷邀请：同一 IP 每小时最多 30 次。
  const limited = await rateLimitOr429(env, request, "tenants/invite", 30, 3600);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return jsonResponse({ error: "Invalid input", issues }, 400);
  }

  // 仅 owner 可授予 admin 角色。
  if (parsed.data.role === "admin" && membership.role !== "owner") {
    return jsonResponse({ error: "Only the owner can add admins" }, 403);
  }

  const target = await getUserByEmail(env.DB, parsed.data.email);
  if (!target || target.status !== "active") {
    return jsonResponse(
      { error: "No active user found with this email" },
      404
    );
  }
  const existing = await getMembership(env.DB, tenant.id, target.id);
  if (existing && existing.status === "active") {
    return jsonResponse({ error: "User is already a member" }, 409);
  }

  await upsertMember(env.DB, tenant.id, target.id, parsed.data.role);
  const members = await listMembers(env.DB, tenant.id);
  return jsonResponse(
    {
      members: members.map((member) => ({
        id: member.user_id,
        name: member.name,
        email: member.email,
        avatar_url: member.avatar_url,
        role: member.role,
        joined_at: member.created_at,
      })),
    },
    201
  );
};
