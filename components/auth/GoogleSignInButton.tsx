"use client";

import { loginWithGoogle } from "@/lib/authClient";
import { GOOGLE_CLIENT_ID, initializeGoogleSignIn } from "@/lib/googleAuth";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

interface GoogleSignInButtonProps {
  /** Called after the server verifies the credential (true = signed in). */
  onResult?: (ok: boolean) => void;
}

/**
 * Official "Sign in with Google" button rendered by GIS into a container
 * div. Used in the desktop header; the mobile menu uses a compact custom
 * button instead because the GIS iframe does not behave well inside a
 * Radix dropdown.
 */
export default function GoogleSignInButton({
  onResult,
}: GoogleSignInButtonProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initializeGoogleSignIn((credential) => {
      void loginWithGoogle(credential).then((user) => {
        onResult?.(Boolean(user));
      });
    }).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [onResult]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;
    // Clear before rendering so React StrictMode re-runs and theme changes
    // don't append duplicate buttons.
    container.innerHTML = "";
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: resolvedTheme === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "pill",
      width: 240,
      logo_alignment: "left",
    });
  }, [ready, resolvedTheme]);

  if (!GOOGLE_CLIENT_ID || !ready) {
    return null;
  }

  return <div ref={containerRef} className="flex items-center" />;
}
