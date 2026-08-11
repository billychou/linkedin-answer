import { getRequestUser, jsonResponse, type AuthEnv } from "../../../../_lib/auth";
import {
  getMembership,
  getTenantById,
  removeMember,
  updateMemberRole,
} from "../../../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string; userId: string };
}

const patchSchema = z
  .object({
    role: z.enum(["admin", "member"]),
  })
  .strict();

/**
 * PATCH  /api/tenants/:id/members/:userId — 调整成员角色（仅 owner）
 * DELETE /api/tenants/:id/members/:userId — 移除成员/退出租户
 *
 * 规则：
 * - owner 不可被移除或降级（未实现所有权转移）；
 * - 仅 owner 可授予/撤销 admin；
 * - admin 可移除非 owner 成员；普通成员只能移除自己（退出）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "PATCH" && request.method !== "DELETE") {
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
  const actor = await getMembership(env.DB, tenant.id, user.id);
  if (!actor || actor.status !== "active") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const target = await getMembership(env.DB, tenant.id, params.userId);
  if (!target || target.status !== "active") {
    return jsonResponse({ error: "Member not found" }, 404);
  }

  if (request.method === "PATCH") {
    if (actor.role !== "owner") {
      return jsonResponse({ error: "Only the owner can change roles" }, 403);
    }
    if (target.role === "owner") {
      return jsonResponse({ error: "Cannot change the owner's role" }, 400);
    }
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid input" }, 400);
    }
    await updateMemberRole(env.DB, tenant.id, target.user_id, parsed.data.role);
    return jsonResponse({ role: parsed.data.role });
  }

  // DELETE：owner 不可被移除；admin 可移除他人；成员可移除自己。
  if (target.role === "owner") {
    return jsonResponse({ error: "The owner cannot be removed" }, 400);
  }
  const isSelf = target.user_id === user.id;
  const canRemoveOthers = actor.role === "owner" || actor.role === "admin";
  if (!isSelf && !canRemoveOthers) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  await removeMember(env.DB, tenant.id, target.user_id);
  return jsonResponse({ removed: true });
};
