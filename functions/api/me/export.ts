import {
  getRequestUser,
  jsonResponse,
  type AuthEnv,
} from "../../_lib/auth";
import {
  listInvoicesForUser,
  getUsableSubscription,
} from "../../_lib/billing";
import { listTenantsForUser, listMembers } from "../../_lib/tenants";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * GET /api/me/export — GDPR 数据导出。
 * 返回当前用户全部个人数据的 JSON 文件（attachment 下载）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const db = env.DB!;
  const { user } = auth;

  const [identitiesRes, membershipsRes] = (await db.batch([
    db
      .prepare(
        `SELECT provider, email, created_at FROM user_identities WHERE user_id = ?`
      )
      .bind(user.id),
    db
      .prepare(
        `SELECT tenant_id, role, status, created_at FROM tenant_members WHERE user_id = ?`
      )
      .bind(user.id),
  ])) as [
    { results: { provider: string; email: string | null; created_at: number }[] },
    { results: { tenant_id: string; role: string; status: string; created_at: number }[] }
  ];
  const identities = identitiesRes.results;
  const memberships = membershipsRes.results;
  const tenants = await listTenantsForUser(db, user.id);
  const subscription = await getUsableSubscription(db, user.id);
  const invoices = await listInvoicesForUser(db, user.id);
  const { results: usage } = await db
    .prepare(`SELECT date, metric, count FROM usage_daily WHERE user_id = ?`)
    .bind(user.id)
    .all();

  // 租户内的聊天等内容由各租户自行管理；此处导出成员身份供核对。
  const tenantMembers = await Promise.all(
    tenants.map(async (tenant) => ({
      tenant_id: tenant.id,
      members: (await listMembers(db, tenant.id)).map((member) => ({
        name: member.name,
        role: member.role,
      })),
    }))
  );

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      locale: user.locale,
      timezone: user.timezone,
      role: user.role,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
    },
    identities,
    tenants: tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      is_personal: Boolean(tenant.is_personal),
      role: tenant.role,
    })),
    memberships,
    tenant_members: tenantMembers,
    subscription,
    invoices,
    usage,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="linkedin-answer-data-export-${date}.json"`,
    },
  });
};
