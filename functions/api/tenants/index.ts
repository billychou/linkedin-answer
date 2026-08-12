import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import {
  createTenant,
  listTenantsForUser,
  setCurrentTenant,
  toTenantSummary,
} from "../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
}

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(50),
  })
  .strict();

/**
 * GET  /api/tenants — 当前用户的全部租户（含角色与成员数）
 * POST /api/tenants — 创建租户（创建者自动成为 owner 并切换过去）
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

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

  if (request.method === "GET") {
    const tenants = await listTenantsForUser(env.DB, user.id);
    return jsonResponse({
      current_tenant_id: user.current_tenant_id,
      tenants: tenants.map(toTenantSummary),
    });
  }

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

  const tenant = await createTenant(env.DB, {
    name: parsed.data.name,
    ownerId: user.id,
  });
  await setCurrentTenant(env.DB, user.id, tenant.id);
  return jsonResponse({ tenant: { ...tenant, is_personal: false } }, 201);
};
