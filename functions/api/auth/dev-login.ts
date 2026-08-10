import {
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
  type AuthEnv,
} from "../../_lib/auth";

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

  const name = "Dev User";
  const email = "dev@example.com";
  const picture = "";
  const { token, exp } = await createSessionToken(env, {
    sub: "dev-local-user",
    email,
    name,
    picture,
  });
  const user = { name, email, picture, exp };
  return jsonResponse({ user }, 200, {
    "Set-Cookie": sessionCookieHeader(token),
  });
};
