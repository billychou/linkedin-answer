"use client";

import type { ProfileUser } from "@/types/user";
import { Sparkles } from "lucide-react";

export function SubscriptionSection({ profile }: { profile: ProfileUser }) {
  const plan = profile.subscription.plan;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current plan</p>
            <p className="text-lg font-semibold capitalize">{plan}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {profile.subscription.status}
          </span>
        </div>

        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <Sparkles className="mb-2 h-4 w-4" />
          Paid plans and billing are coming soon. When subscriptions launch,
          you&apos;ll be able to upgrade, change your plan, and view invoices
          right here.
        </div>
      </div>
    </div>
  );
}
