"use client";

import { GOOGLE_CLIENT_ID } from "@/lib/googleAuth";
import Script from "next/script";

/**
 * Loads the Google Identity Services script. Mirrors the GoogleAnalytics
 * pattern, but is rendered in every environment so login also works in
 * development.
 */
const GoogleSignInScript = () => {
  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
    />
  );
};

export default GoogleSignInScript;
