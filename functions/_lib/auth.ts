import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

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
}

export interface SessionUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
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
  claims: { sub: string; email: string; name?: string; picture?: string }
): Promise<{ token: string; exp: number }> {
  const secret = new TextEncoder().encode(env.SESSION_SECRET ?? "");
  if (!secret.length) throw new Error("SESSION_SECRET is not configured");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await new SignJWT({
    email: claims.email,
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.picture ? { picture: claims.picture } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
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
      sub: String(payload.sub),
      email,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture:
        typeof payload.picture === "string" ? payload.picture : undefined,
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
