import { useUserStore } from "@/stores/userStore";
import type { GoogleUser, ProfilePatch, ProfileUser } from "@/types/user";

/**
 * Client helpers for the server-backed Google session.
 *
 * The server (Cloudflare Pages Functions) is the source of truth: it verifies
 * the Google ID token, issues the HttpOnly session cookie, and reports the
 * current user. The zustand store below only mirrors that state for UI.
 */

const PROTECTED_PATHS = [
  "/chat",
  "/en/chat",
  "/zh/chat",
  "/ja/chat",
  "/settings",
  "/en/settings",
  "/zh/settings",
  "/ja/settings",
];

/**
 * Build-time flag (inlined by Next.js). When true, the login page shows a
 * "Dev login" button that uses /api/auth/dev-login. Only set this in local
 * .env — never in the production build.
 */
export const DEV_FAKE_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_DEV_FAKE_LOGIN === "true";

/** Exchange a Google ID token for a server session and update local state. */
export async function loginWithGoogle(
  credential: string
): Promise<GoogleUser | null> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = (await res.json()) as { user?: GoogleUser | null };
    const user = res.ok && data.user ? data.user : null;
    useUserStore.getState().setUser(user);
    return user;
  } catch {
    useUserStore.getState().setUser(null);
    return null;
  }
}

/**
 * DEV-ONLY: mint a session without Google verification. Returns null when the
 * route is disabled on the server (DEV_FAKE_LOGIN not set), mirroring how a
 * failed Google login behaves.
 */
export async function devLogin(): Promise<GoogleUser | null> {
  try {
    const res = await fetch("/api/auth/dev-login", { method: "POST" });
    const data = (await res.json()) as { user?: GoogleUser | null };
    const user = res.ok && data.user ? data.user : null;
    useUserStore.getState().setUser(user);
    return user;
  } catch {
    useUserStore.getState().setUser(null);
    return null;
  }
}

/** Fetch the current user from the server session and sync local state. */
export async function fetchSession(): Promise<GoogleUser | null> {
  try {
    const res = await fetch("/api/auth/session", {
      headers: { Accept: "application/json" },
    });
    const data = (await res.json()) as { user?: GoogleUser | null };
    const user = res.ok ? (data.user ?? null) : null;
    useUserStore.getState().setUser(user);
    return user;
  } catch {
    useUserStore.getState().setUser(null);
    return null;
  }
}

/** Fetch the full profile from the server (requires a valid session). */
export async function fetchProfile(): Promise<ProfileUser | null> {
  try {
    const res = await fetch("/api/me", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: ProfileUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Update profile fields. Returns the updated profile, or null on failure.
 * Also syncs the mirrored session state (name/avatar) for the header UI.
 */
export async function updateProfile(
  patch: ProfilePatch
): Promise<ProfileUser | null> {
  try {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: ProfileUser };
    const profile = data.user ?? null;
    if (profile) {
      useUserStore.getState().setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        picture: profile.avatar_url,
        exp: 0,
      });
    }
    return profile;
  } catch {
    return null;
  }
}

/** Clear the server session and local state; leave protected pages. */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore network errors; local state is cleared below regardless.
  }
  useUserStore.getState().signOut();
  if (
    typeof window !== "undefined" &&
    PROTECTED_PATHS.includes(window.location.pathname)
  ) {
    window.location.replace("/login");
  }
}
