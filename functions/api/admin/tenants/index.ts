import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";

interface Context {
  request: Request;
  env: AuthEnv;
}

interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  is_personal: number;
  owner_id: string;
  owner_email: string;
  member_count: number;
  created_at: number;
}

/**
 * GET /api/admin/tenants?search=&limit=&offset= — 租户列表（仅站点管理员）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "GET") {
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

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0") || 0, 0);

  const where = search
    ? "WHERE LOWER(t.name) LIKE ? OR LOWER(t.slug) LIKE ? OR LOWER(u.email) LIKE ?"
    : "";
  const like = `%${search}%`;
  const bindings = search ? [like, like, like, limit, offset] : [limit, offset];

  const { results } = await env.DB.prepare(
    `SELECT t.id, t.name, t.slug, t.plan, t.status, t.is_personal,
            t.owner_id, u.email AS owner_email,
            (SELECT COUNT(*) FROM tenant_members m
              WHERE m.tenant_id = t.id AND m.status = 'active') AS member_count,
            t.created_at
     FROM tenants t
     JOIN users u ON u.id = t.owner_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...bindings)
    .all<AdminTenantRow>();

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM tenants t JOIN users u ON u.id = t.owner_id ${where}`
  )
    .bind(...(search ? [like, like, like] : []))
    .first<{ total: number }>();

  return jsonResponse({
    tenants: results.map((row) => ({ ...row, is_personal: row.is_personal === 1 })),
    total: totalRow?.total ?? results.length,
  });
};
