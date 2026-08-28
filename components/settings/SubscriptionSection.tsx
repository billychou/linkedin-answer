"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  fetchBillingSubscription,
  openBillingPortal,
  type BillingInvoice,
  type BillingSubscriptionDetail,
} from "@/lib/billingClient";
import type { ProfileUser } from "@/types/user";
import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

/** 订阅 Tab：当前套餐与权益（查库结果，非 Stripe 返回值）+ 发票历史。 */
export function SubscriptionSection({ profile }: { profile: ProfileUser }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<BillingSubscriptionDetail | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchBillingSubscription().then((data) => {
      if (cancelled) return;
      setLoading(false);
      if (data) {
        setDetail(data.subscription);
        setInvoices(data.invoices);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPaid = detail
    ? detail.status !== "free" && detail.plan !== "free"
    : false;

  const handleManage = useCallback(async () => {
    setOpeningPortal(true);
    const url = await openBillingPortal();
    setOpeningPortal(false);
    if (url) {
      window.location.href = url;
      return;
    }
    toast({
      title: "Billing portal unavailable",
      description: "Please try again later.",
      variant: "destructive",
    });
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const planName = detail?.plan_name ?? profile.subscription.plan;
  const status = detail?.status ?? profile.subscription.status;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current plan</p>
            <p className="text-lg font-semibold">{planName}</p>
            {detail?.cancel_at_period_end && detail.current_period_end && (
              <p className="text-xs text-muted-foreground">
                Cancels on {formatDate(detail.current_period_end)}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              isPaid
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {status === "free" ? "free plan" : status}
          </span>
        </div>

        {detail && (
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>AI chat: {detail.features.chatPerDay} messages / day</li>
            <li>Chat history kept: {detail.features.historyDays} days</li>
            {detail.features.priority && <li>Priority support included</li>}
          </ul>
        )}

        {!isPaid ? (
          <div className="rounded-md border border-dashed p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Sparkles className="mb-1 mr-1 inline h-4 w-4 text-primary" />
              Upgrade to Pro for 100 AI chats per day, a full year of chat
              history, and priority support.
            </p>
            <Button asChild size="sm">
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleManage()} disabled={openingPortal}>
              {openingPortal ? "Opening…" : "Manage billing"}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
        <p className="text-sm font-medium">Invoice history</p>
        {invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No invoices yet. Invoices appear here after your first payment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{formatDate(invoice.created_at)}</td>
                    <td className="py-2 pr-4">
                      {formatPrice(invoice.amount_cents)}{" "}
                      <span className="uppercase text-xs text-muted-foreground">
                        {invoice.currency}
                      </span>
                    </td>
                    <td className="py-2 pr-4 capitalize">{invoice.status}</td>
                    <td className="py-2">
                      {invoice.hosted_invoice_url ? (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
