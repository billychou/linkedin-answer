import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { getTenantById, updateTenant } from "../../../_lib/tenants";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string };
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(50),
    status: z.enum(["active", "disabled"]),
    plan: z.enum(["free", "pro"]),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Empty patch");

/**
 * PATCH /api/admin/tenants/:id — 更新租户名称/状态/套餐（仅站点管理员）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method !== "PATCH") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (auth.user.role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const tenant = await getTenantById(env.DB, params.id);
  if (!tenant) {
    return jsonResponse({ error: "Tenant not found" }, 404);
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
