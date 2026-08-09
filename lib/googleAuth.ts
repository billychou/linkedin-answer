/**
 * Google Identity Services ("Sign in with Google") helpers.
 *
 * Note: this site is a pure static export with no server, so the ID token
 * returned by Google is only decoded on the client and never verified
 * server-side. It is used for personalization-level login state only, not
 * for protecting sensitive data.
 */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Claims we read from a Google ID token payload. */
export interface GoogleIdTokenPayload {
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  /** Expiry in seconds since epoch. */
  exp?: number;
}

/**
 * Decode the payload section of a JWT without verifying its signature.
 * Returns null when the token is malformed.
 */
export function decodeJwtPayload<T = GoogleIdTokenPayload>(
  credential: string
): T | null {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return null;
    // base64url -> base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    // Decode UTF-8 safely (display names may contain non-ASCII characters).
    const json = decodeURIComponent(
      binary
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Whether the GIS script has finished loading. */
function isGisLoaded(): boolean {
  return typeof google !== "undefined" && Boolean(google.accounts?.id);
}

/**
 * Poll until the GIS script is available. The script is injected with
 * next/script strategy="afterInteractive", so it can lag behind component
 * mount.
 */
export function waitForGoogleAccounts(timeoutMs = 5000): Promise<boolean> {
  if (isGisLoaded()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (isGisLoaded()) {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 100);
  });
}

let initializePromise: Promise<boolean> | null = null;
const credentialHandlers = new Set<(credential: string) => void>();

/**
 * Initialize GIS exactly once per page. Safe for React StrictMode and for
 * multiple components (desktop header + mobile menu + login page) calling in
 * parallel: every registered handler is invoked with the credential.
 * Resolves to false when the client id is missing or the script failed to
 * load.
 */
export function initializeGoogleSignIn(
  handler: (credential: string) => void
): Promise<boolean> {
  credentialHandlers.add(handler);
  initializePromise ??= waitForGoogleAccounts().then((loaded) => {
    if (!loaded) return false;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        for (const onCredential of credentialHandlers) {
          onCredential(response.credential);
        }
      },
    });
    return true;
  });
  return initializePromise;
}
