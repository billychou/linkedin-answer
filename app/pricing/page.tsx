import PricingClient from "@/components/pricing/PricingClient";
import { constructMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  page: "Pricing",
  title: "Pricing — LinkedIn Answer Today",
  description:
    "Free daily answers for everyone. Upgrade to Pro for unlimited AI chat, full answer archives, and priority support.",
  path: `/pricing`,
  canonicalUrl: `/pricing`,
});

export default function PricingPage() {
  return <PricingClient />;
}
