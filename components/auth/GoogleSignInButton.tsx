"use client";

import { GOOGLE_CLIENT_ID, initializeGoogleSignIn } from "@/lib/googleAuth";
import { useUserStore } from "@/stores/userStore";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

/**
 * Official "Sign in with Google" button rendered by GIS into a container
 * div. Used in the desktop header; the mobile menu uses a compact custom
 * button instead because the GIS iframe does not behave well inside a
 * Radix dropdown.
 */
export default function GoogleSignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const signIn = useUserStore((state) => state.signIn);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initializeGoogleSignIn((credential) => signIn(credential)).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [signIn]);

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
