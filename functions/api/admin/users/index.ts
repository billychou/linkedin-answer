import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";

interface Context {
  request: Request;
  env: AuthEnv;
}

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  status: string;
  role: string;
  created_at: number;
  last_login_at: number | null;
  tenant_name: string | null;
  tenant_count: number;
}

/**
 * GET /api/admin/users?search=&limit=&offset= — 用户列表（仅站点管理员）。
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
    ? "WHERE LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ?"
    : "";
  const like = `%${search}%`;
  const bindings = search ? [like, like, limit, offset] : [limit, offset];

  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.avatar_url, u.status, u.role,
            u.created_at, u.last_login_at,
            t.name AS tenant_name,
            (SELECT COUNT(*) FROM tenant_members m
              WHERE m.user_id = u.id AND m.status = 'active') AS tenant_count
     FROM users u
     LEFT JOIN tenants t ON t.id = u.current_tenant_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...bindings)
    .all<AdminUserRow>();

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM users u ${where}`
  )
    .bind(...(search ? [like, like] : []))
    .first<{ total: number }>();

  return jsonResponse({ users: results, total: totalRow?.total ?? results.length });
};
