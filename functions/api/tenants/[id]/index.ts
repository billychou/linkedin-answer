import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import {
  getMembership,
  getTenantById,
  listMembers,
  toTenantSummary,
  updateTenant,
  type TenantWithMembership,
} from "../../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string };
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(50),
    avatar_url: z.union([
      z.literal(""),
      z
        .string()
        .url("Avatar must be a valid URL")
        .refine((url) => url.startsWith("https://"), "Avatar must be https"),
    ]),
  })
  .strict()
  .partial();

/**
 * GET   /api/tenants/:id — 租户详情（含成员列表），仅限成员访问
 * PATCH /api/tenants/:id — 更新租户资料，仅限 owner/admin
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "GET" && request.method !== "PATCH") {
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
    const withRole: TenantWithMembership = {
      ...tenant,
      role: membership.role,
      member_count: members.length,
    };
    return jsonResponse({
      tenant: toTenantSummary(withRole),
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

  const updated = await updateTenant(env.DB, tenant.id, parsed.data);
  return jsonResponse({
    tenant: { ...updated, is_personal: updated.is_personal === 1 },
  });
};
