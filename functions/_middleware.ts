import {
  getSessionToken,
  safeNextPath,
  verifySessionToken,
  type AuthEnv,
} from "./_lib/auth";

/** Routes that require a valid session. */
const PROTECTED_PATHS = new Set(["/chat", "/settings"]);

interface Context {
  request: Request;
  env: AuthEnv;
  next: () => Promise<Response>;
}

/**
 * Edge access control: unauthenticated requests to /chat are redirected to
 * /login?next=<path>; everything else passes through unchanged.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!PROTECTED_PATHS.has(url.pathname)) {
    return next();
  }

  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  if (session) {
    return next();
  }

  const target = new URL(
    `/login?next=${encodeURIComponent(safeNextPath(url.pathname) ?? "/chat")}`,
    url.origin
  );
  return Response.redirect(target.toString(), 302);
};
