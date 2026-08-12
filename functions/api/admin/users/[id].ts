import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { getUserById, toPublicUser } from "../../../_lib/db";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
  params: { id: string };
}

const patchSchema = z
  .object({
    role: z.enum(["user", "admin"]),
    status: z.enum(["active", "disabled"]),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Empty patch");

/**
 * PATCH /api/admin/users/:id — 调整用户角色/状态（仅站点管理员）。
 * 不允许修改自己，避免误操作导致管理员被锁在外面。
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
  if (auth.user.id === params.id) {
    return jsonResponse({ error: "Cannot update yourself here" }, 400);
  }

  const target = await getUserById(env.DB, params.id);
  if (!target) {
    return jsonResponse({ error: "User not found" }, 404);
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

  const sets: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.role !== undefined) {
    sets.push("role = ?");
    values.push(parsed.data.role);
  }
  if (parsed.data.status !== undefined) {
    sets.push("status = ?");
    values.push(parsed.data.status);
  }
  if (sets.length) {
    values.push(Date.now(), target.id);
    await env.DB.prepare(
      `UPDATE users SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`
    )
      .bind(...values)
      .run();
  }

  const updated = await getUserById(env.DB, target.id);
  if (!updated) {
    return jsonResponse({ error: "User not found" }, 404);
  }
  return jsonResponse({
    user: { ...toPublicUser(updated), status: updated.status },
  });
};
