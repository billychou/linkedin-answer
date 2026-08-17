import { getRequestUser, jsonResponse, type AuthEnv } from "../../../../_lib/auth";
import { revokeInvite } from "../../../../_lib/invites";
import { getMembership, getTenantById } from "../../../../_lib/tenants";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string; inviteId: string };
}

/** DELETE /api/tenants/:id/invites/:inviteId — 撤销待处理邀请（owner/admin）。 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "DELETE") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const tenant = await getTenantById(env.DB, params.id);
  if (!tenant) {
    return jsonResponse({ error: "Tenant not found" }, 404);
  }
  const membership = await getMembership(env.DB, tenant.id, auth.user.id);
  if (!membership || membership.status !== "active") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const revoked = await revokeInvite(env.DB, tenant.id, params.inviteId);
  if (!revoked) {
    return jsonResponse({ error: "Invite not found or already handled" }, 404);
  }
  return jsonResponse({ ok: true });
};
