import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import {
  getMembership,
  getTenantById,
  setCurrentTenant,
} from "../../../_lib/tenants";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string };
}

/**
 * POST /api/tenants/:id/switch — 切换当前租户（仅限有效成员）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "POST") {
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

  await setCurrentTenant(env.DB, user.id, tenant.id);
  return jsonResponse({ current_tenant_id: tenant.id });
};
