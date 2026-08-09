import LoginClient from "@/components/auth/LoginClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Login",
  title: "Sign in",
  description: "Sign in with Google to access the AI chat demo.",
  path: `/login`,
  canonicalUrl: `/login`,
  noIndex: true,
});

export default function LoginPage() {
  return <LoginClient />;
}
