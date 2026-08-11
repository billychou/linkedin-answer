import AdminClient from "@/components/admin/AdminClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Admin",
  title: "Admin Console",
  description: "Manage users and tenants.",
  path: `/admin`,
  canonicalUrl: `/admin`,
  noIndex: true,
});

export default function AdminPage() {
  return <AdminClient />;
}
