import SettingsClient from "@/components/settings/SettingsClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Settings",
  title: "Account Settings",
  description: "View and update your account profile and preferences.",
  path: `/settings`,
  canonicalUrl: `/settings`,
  noIndex: true,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
