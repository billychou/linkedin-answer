import {
  getSessionToken,
  jsonResponse,
  verifySessionToken,
  type AuthEnv,
} from "../../_lib/auth";
import {
  getUserById,
  toPublicUser,
  updateUserProfile,
} from "../../_lib/db";
import { z } from "zod";

interface Context {
  request: Request;
  env: AuthEnv;
}

/** IANA 时区校验：利用 Intl 构造失败来判断。 */
function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty").max(50),
    bio: z.string().trim().max(500),
    avatar_url: z.union([
      z.literal(""),
      z
        .string()
        .url("Avatar must be a valid URL")
        .refine((url) => url.startsWith("https://"), "Avatar must be https"),
    ]),
    locale: z.enum(["en", "zh", "ja"]),
    timezone: z.string().refine(isValidTimezone, "Invalid timezone"),
  })
  .strict() // 拒绝未知字段
  .partial(); // 允许只更新其中一部分

/**
 * GET  /api/me  — 当前登录用户完整资料
 * PATCH /api/me  — 更新资料（name/bio/avatar_url/locale/timezone）
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "GET" && request.method !== "PATCH") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  if (!session) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const user = await getUserById(env.DB, session.id);
  if (!user || user.status !== "active") {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (request.method === "GET") {
    return jsonResponse({ user: toPublicUser(user) });
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

  const updated = await updateUserProfile(env.DB, user.id, parsed.data);
  return jsonResponse({ user: toPublicUser(updated) });
};
