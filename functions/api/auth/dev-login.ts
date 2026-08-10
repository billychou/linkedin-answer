import {
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
  type AuthEnv,
} from "../../_lib/auth";
import { detectLocale, findOrCreateUserByIdentity } from "../../_lib/db";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * DEV-ONLY login: mints a session without Google verification.
 *
 * This exists because the local `wrangler pages dev` sandbox cannot reach
 * Google's JWKS endpoint (googleapis.com) from restricted networks, so the
 * real /api/auth/login always fails locally. It is enabled ONLY when
 * env.DEV_FAKE_LOGIN === "true" and returns 404 otherwise.
 *
 * NEVER set DEV_FAKE_LOGIN in the production Cloudflare Pages dashboard.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (env.DEV_FAKE_LOGIN !== "true") {
    return jsonResponse({ error: "Not Found" }, 404);
  }
  if (!env.SESSION_SECRET) {
    return jsonResponse({ error: "SESSION_SECRET is not configured" }, 500);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const name = "Dev User";
  const email = "dev@example.com";
  const picture = "";

  // 与真实登录一致：dev 用户也落库，便于本地验证用户系统。
  const user = await findOrCreateUserByIdentity(env.DB, {
    provider: "dev",
    subject: "dev-local-user",
    email,
    name,
    picture,
    locale: detectLocale(request.headers.get("accept-language")),
  });

  const { token, exp } = await createSessionToken(env, {
    id: user.id,
    email: user.email,
    name: user.name || name,
    picture: user.avatar_url || picture,
  });
  const sessionUser = {
    id: user.id,
    name: user.name || name,
    email: user.email,
    picture: user.avatar_url || picture,
    exp,
  };
  return jsonResponse({ user: sessionUser }, 200, {
    "Set-Cookie": sessionCookieHeader(token),
  });
};
