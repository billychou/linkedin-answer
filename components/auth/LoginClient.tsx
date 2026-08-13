"use client";

import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { devLogin, DEV_FAKE_LOGIN_ENABLED, fetchSession } from "@/lib/authClient";
import { useUserStore } from "@/stores/userStore";
import { useCallback, useEffect, useState } from "react";

/** Mirror of the server-side rule: only safe relative paths are accepted. */
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }
  return raw;
}

function currentNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return safeNextPath(next) ?? "/chat";
}

/**
 * Sign-in screen for protected pages. Shows a Google login card and returns
 * the visitor to the originally requested page (`?next=`) once signed in.
 */
export default function LoginClient() {
  const user = useUserStore((state) => state.user);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  // Hydrate the session on mount; already signed in -> go straight back.
  useEffect(() => {
    void fetchSession().then((current) => {
      setChecked(true);
      if (current) window.location.replace(currentNextPath());
    });
  }, []);

  // After signing in on this page, redirect once the store updates.
  useEffect(() => {
    if (checked && user) {
      window.location.replace(currentNextPath());
    }
  }, [user, checked]);

  const handleResult = useCallback((ok: boolean) => {
    setError(!ok);
  }, []);

  const handleDevLogin = useCallback(async () => {
    const ok = await devLogin();
    setError(!ok);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Sign in to access Chat
        </h1>
        <p className="text-sm text-muted-foreground">
          The AI chat demo requires a Google account. Sign in to continue.
        </p>
      </div>

      <div className="flex justify-center">
        <GoogleSignInButton onResult={handleResult} />
      </div>

      {DEV_FAKE_LOGIN_ENABLED && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">— or —</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDevLogin()}
          >
            Dev login (local only)
          </Button>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      )}
    </div>
  );
}
