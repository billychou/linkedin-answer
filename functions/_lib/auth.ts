import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { getUserById, type D1Database, type DbUser } from "./db";

/**
 * Shared server-side auth helpers for Cloudflare Pages Functions.
 *
 * Google ID tokens are verified against Google's JWKS endpoint; the session
 * JWT issued afterwards is signed with HS256 using SESSION_SECRET and stored
 * in an HttpOnly cookie.
 */

export const SESSION_COOKIE_NAME = "session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AuthEnv {
  GOOGLE_CLIENT_ID?: string;
  SESSION_SECRET?: string;
  /** 仅本地开发：启用 /api/auth/dev-login（切勿在生产配置）。 */
  DEV_FAKE_LOGIN?: string;
  /** D1 binding（用户系统）。 */
  DB?: D1Database;
  /** Stripe（Phase 2 计费，functions/_lib/stripe.ts）。 */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Upstash Redis 限流（functions/_lib/rateLimit.ts）。 */
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  /** 站点 URL（Checkout 回跳等），未配置时回退请求 Origin。 */
  NEXT_PUBLIC_SITE_URL?: string;
}

/** 站点绝对 URL（去掉尾部斜杠）；未配置时回退请求 Origin。 */
export function siteBaseUrl(env: AuthEnv, request: Request): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export interface SessionUser {
  /** 内部用户 ID（users.id），即会话 JWT 的 subject。 */
  id: string;
  email: string;
  name?: string;
  picture?: string;
  /** 登录时缓存的角色（仅用于 UI 展示；权限校验一律查库）。 */
  role: string;
  /** Session expiry in seconds since epoch. */
  exp: number;
}

/** Cached Google public keys; jose refreshes the JWKS automatically. */
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

/**
 * Verify a Google ID token and return its verified payload.
 * Rejects bad signatures, wrong audience/issuer, expired tokens, and accounts
 * with an unverified email (unless the account has a hosted domain, `hd`).
 */
export async function verifyGoogleIdToken(
  credential: string,
  clientId: string
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(credential, googleJwks, {
    issuer: "https://accounts.google.com",
    audience: clientId,
  });
  if (payload.email_verified !== true && typeof payload.hd !== "string") {
    throw new Error("Google account email is not verified");
  }
  return payload as Record<string, unknown>;
}

/** Sign a session JWT (HS256) valid for SESSION_TTL_SECONDS. */
export async function createSessionToken(
  env: AuthEnv,
  claims: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
    role?: string;
  }
): Promise<{ token: string; exp: number }> {
  const secret = new TextEncoder().encode(env.SESSION_SECRET ?? "");
  if (!secret.length) throw new Error("SESSION_SECRET is not configured");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await new SignJWT({
    email: claims.email,
    role: claims.role ?? "user",
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.picture ? { picture: claims.picture } : {}),
    })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.id)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
  return { token, exp };
}

/** Verify a session JWT; returns the session or null when invalid/expired. */
export async function verifySessionToken(
  token: string,
  env: AuthEnv
): Promise<SessionUser | null> {
  const secret = new TextEncoder().encode(env.SESSION_SECRET ?? "");
  if (!secret.length) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!payload.sub || !email) return null;
    return {
      id: String(payload.sub),
      email,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture:
        typeof payload.picture === "string" ? payload.picture : undefined,
      role: typeof payload.role === "string" ? payload.role : "user",
      exp: typeof payload.exp === "number" ? payload.exp : 0,
    };
  } catch {
    return null;
  }
}

/** Read the session cookie from a request. */
export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE_NAME) {
      return part.slice(idx + 1).trim() || null;
    }
  }
  return null;
}

/** Build the Set-Cookie header; pass null to clear the session cookie. */
export function sessionCookieHeader(token: string | null): string {
  const value = token ?? "";
  const maxAge = token ? SESSION_TTL_SECONDS : 0;
  return `${SESSION_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Only allow safe relative paths for the `next` redirect parameter.
 * Rejects absolute URLs, protocol-relative URLs, and backslashes.
 */
export function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }
  return raw;
}

/** JSON response helper shared by the auth endpoints. */
export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

/**
 * 校验会话并查库返回当前活跃用户。
 * JWT 仅作身份索引，角色/状态等权限数据一律以数据库为准。
 */
export async function getRequestUser(
  request: Request,
  env: AuthEnv
): Promise<{ session: SessionUser; user: DbUser } | null> {
  const token = getSessionToken(request);
  const session = token ? await verifySessionToken(token, env) : null;
  if (!session || !env.DB) return null;
  const user = await getUserById(env.DB, session.id);
  if (!user || user.status !== "active") return null;
  return { session, user };
}
