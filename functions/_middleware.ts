import {
  getSessionToken,
  safeNextPath,
  verifySessionToken,
  type AuthEnv,
} from "./_lib/auth";

/** Routes that require a valid session (matched after stripping locale prefix). */
const PROTECTED_PATHS = new Set(["chat", "settings", "admin", "invites"]);

/** Locale prefixes used by next-intl (`as-needed` strategy, see i18n/routing.ts). */
const LOCALE_PREFIXES = new Set(["en", "zh", "ja"]);

interface Context {
  request: Request;
  env: AuthEnv;
  next: () => Promise<Response>;
}

/**
 * Edge access control: unauthenticated requests to protected paths
 * (/chat, /settings, /admin, /invites, including /zh//ja/ prefixed
 * variants) are redirected to /login?next=<path>?<query>; everything
 * else passes through. The query string is preserved so flows like
 * /invites/accept?token=... survive the login round-trip.
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length && LOCALE_PREFIXES.has(segments[0])) {
    segments.shift();
  }
  const isProtected = segments.length > 0 && PROTECTED_PATHS.has(segments[0]);
  if (!isProtected) {
    return next();
  }

  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  if (session) {
    return next();
  }

  // 保留 query：邀请接受等流程依赖 ?token=... 跨登录往返。
  const nextPath = safeNextPath(url.pathname + url.search) ?? "/chat";
  const target = new URL(
    `/login?next=${encodeURIComponent(nextPath)}`,
    url.origin
  );
  return Response.redirect(target.toString(), 302);
};
