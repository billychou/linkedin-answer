import { jsonResponse, sessionCookieHeader } from "../../_lib/auth";

interface Context {
  request: Request;
}

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  return jsonResponse({ ok: true }, 200, {
    "Set-Cookie": sessionCookieHeader(null),
  });
};
