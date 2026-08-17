import AcceptInviteClient from "@/components/invites/AcceptInviteClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Accept Invite",
  title: "Accept Invitation",
  description: "Accept your workspace invitation.",
  path: `/invites/accept`,
  canonicalUrl: `/invites/accept`,
  noIndex: true,
});

export default function AcceptInvitePage() {
  return <AcceptInviteClient />;
}
