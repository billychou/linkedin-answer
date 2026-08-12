import {
  getSessionToken,
  jsonResponse,
  verifySessionToken,
  type AuthEnv,
} from "../../_lib/auth";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * GET /api/auth/session
 * Returns the signed-in user from the session cookie, or { user: null }.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  const user = session
    ? {
        id: session.id,
        name: session.name ?? session.email,
        email: session.email,
        picture: session.picture ?? "",
        role: session.role,
        exp: session.exp,
      }
    : null;
  return jsonResponse({ user });
};
