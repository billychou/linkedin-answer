"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchSession } from "@/lib/authClient";
import {
  fetchBillingSubscription,
  startCheckout,
} from "@/lib/billingClient";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PlanCard {
  id: "free" | "pro_monthly" | "pro_yearly";
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

/** 与 migrations/0003_billing.sql 的 plans seed 保持一致。 */
const PLAN_CARDS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need for today's games.",
    features: [
      "Daily answers for all 6 LinkedIn games",
      "5 AI chat messages per day",
      "7-day answer history",
      "Community support",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: "$5.99",
    period: "per month",
    tagline: "For players who never want to miss a streak.",
    features: [
      "Everything in Free",
      "100 AI chat messages per day",
      "Full 365-day answer archive",
      "Priority support",
      "Early access to new game coverage",
    ],
    highlighted: true,
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    price: "$49.90",
    period: "per year",
    tagline: "Two months free.",
    badge: "Best value",
    features: [
      "Everything in Pro Monthly",
      "2 months free vs. monthly billing",
      "Lock in your price for a year",
    ],
  },
];

export default function PricingClient() {
  const { toast } = useToast();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then(async (user) => {
      if (cancelled) return;
      setSignedIn(Boolean(user));
      if (!user) return;
      const billing = await fetchBillingSubscription();
      if (!cancelled && billing) {
        setCurrentPlan(billing.subscription.plan);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // /pricing?checkout=canceled — 用户从 Stripe Checkout 返回。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "canceled") {
      toast({
        title: "Checkout canceled",
        description: "No charge was made. You can upgrade anytime.",
      });
      window.history.replaceState({}, "", "/pricing");
    }
  }, [toast]);

  const handleUpgrade = useCallback(
    async (planId: string) => {
      setCheckingOut(planId);
      const url = await startCheckout(planId);
      setCheckingOut(null);
      if (url) {
        window.location.href = url;
        return;
      }
      toast({
        title: "Checkout unavailable",
        description: "Paid plans are launching soon. Stay tuned!",
        variant: "destructive",
      });
    },
    [toast]
  );

  const renderCta = (plan: PlanCard) => {
    if (plan.id === "free") {
      return (
        <Button asChild variant="outline" className="w-full">
          <Link href="/games">Start for free</Link>
        </Button>
      );
    }
    if (signedIn === null) {
      return (
        <Button className="w-full" disabled aria-busy>
          Loading…
        </Button>
      );
    }
    if (!signedIn) {
      return (
        <Button asChild className="w-full">
          <Link href={`/login?next=${encodeURIComponent("/pricing")}`}>
            Sign in to upgrade
          </Link>
        </Button>
      );
    }
    if (currentPlan === plan.id) {
      return (
        <Button className="w-full" disabled>
          Current plan
        </Button>
      );
    }
    return (
      <Button
        className="w-full"
        disabled={checkingOut !== null}
        onClick={() => void handleUpgrade(plan.id)}
      >
        {checkingOut === plan.id ? "Redirecting…" : `Upgrade to ${plan.name}`}
      </Button>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Daily answers stay free forever. Pro unlocks the AI assistant, the
          full archive, and priority support.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_CARDS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-xl border bg-card p-6 shadow-sm ${
              plan.highlighted ? "border-primary ring-1 ring-primary" : ""
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {plan.badge}
              </span>
            )}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted-foreground">
                / {plan.period}
              </span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">{renderCta(plan)}</div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Prices in USD. Cancel anytime — your plan stays active until the end of
        the billing period. Questions? Check the FAQ or contact support.
      </p>
    </div>
  );
}
