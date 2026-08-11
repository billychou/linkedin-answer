import {
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
  verifyGoogleIdToken,
  type AuthEnv,
} from "../../_lib/auth";
import {
  detectLocale,
  findOrCreateUserByIdentity,
} from "../../_lib/db";
import { ensureDefaultTenant } from "../../_lib/tenants";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * POST /api/auth/login
 * Body: { credential: "<Google ID token>" }
 * Verifies the Google ID token server-side, then issues an HttpOnly session
 * cookie and returns the signed-in user.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const clientId = env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return jsonResponse({ error: "GOOGLE_CLIENT_ID is not configured" }, 500);
  }
  if (!env.SESSION_SECRET) {
    return jsonResponse({ error: "SESSION_SECRET is not configured" }, 500);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  let credential = "";
  try {
    const body = (await request.json()) as { credential?: unknown };
    credential = typeof body?.credential === "string" ? body.credential : "";
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  if (!credential) {
    return jsonResponse({ error: "Missing credential" }, 400);
  }

  try {
    const payload = await verifyGoogleIdToken(credential, clientId);
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub || !email) {
      return jsonResponse({ error: "Invalid Google account" }, 401);
    }

    const name = typeof payload.name === "string" ? payload.name : email;
    const picture =
      typeof payload.picture === "string" ? payload.picture : "";
    const cf = (request as unknown as { cf?: { timezone?: string } }).cf;

    // 登录即落库：按身份查找/创建用户（users + user_identities）。
    const user = await findOrCreateUserByIdentity(env.DB, {
      provider: "google",
      subject: sub,
      email,
      name,
      picture,
      locale: detectLocale(request.headers.get("accept-language")),
      timezone: cf?.timezone ?? "UTC",
    });

    // 租户保障：确保用户拥有可用租户（首次登录自动创建个人租户）。
    await ensureDefaultTenant(env.DB, user);

    const { token, exp } = await createSessionToken(env, {
      id: user.id,
      email: user.email,
      name: user.name || name,
      picture: user.avatar_url || picture,
      role: user.role,
    });
    const sessionUser = {
      id: user.id,
      name: user.name || name,
      email: user.email,
      picture: user.avatar_url || picture,
      role: user.role,
      exp,
    };
    return jsonResponse({ user: sessionUser }, 200, {
      "Set-Cookie": sessionCookieHeader(token),
    });
  } catch {
    return jsonResponse({ error: "Invalid credential" }, 401);
  }
};
