import {
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
  verifyGoogleIdToken,
  type AuthEnv,
} from "../../_lib/auth";

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
    const { token, exp } = await createSessionToken(env, {
      sub,
      email,
      name,
      picture,
    });
    const user = { name, email, picture, exp };
    return jsonResponse({ user }, 200, {
      "Set-Cookie": sessionCookieHeader(token),
    });
  } catch {
    return jsonResponse({ error: "Invalid credential" }, 401);
  }
};
