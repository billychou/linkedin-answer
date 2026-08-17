"use client";

import { adminFetchMetrics, type AdminMetrics } from "@/lib/tenantClient";
import { useEffect, useState } from "react";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** 纯 CSS 柱状图：不引图表库，数据量小够用。 */
function BarChart({
  title,
  data,
  color,
}: {
  title: string;
  data: { d: string; n: number }[];
  color: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.n));
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <div className="flex h-28 items-end gap-[3px]">
          {data.map((item) => (
            <div
              key={item.d}
              className={`flex-1 rounded-sm ${color}`}
              style={{ height: `${Math.max(4, (item.n / max) * 100)}%`, opacity: item.n === 0 ? 0.2 : 1 }}
              title={`${item.d}: ${item.n}`}
            />
          ))}
        </div>
      )}
      {data.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{data[0].d}</span>
          <span>{data[data.length - 1].d}</span>
        </div>
      )}
    </div>
  );
}

/** 补齐缺失日期为 0，保证柱状图连续。 */
function fillDays(rows: { d: string; n: number }[], days: number): { d: string; n: number }[] {
  const map = new Map(rows.map((row) => [row.d, row.n]));
  const out: { d: string; n: number }[] = [];
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = cursor.toISOString().slice(0, 10);
    out.push({ d, n: map.get(d) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void adminFetchMetrics().then((data) => {
      if (cancelled) return;
      if (data) setMetrics(data);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <p className="text-sm text-muted-foreground">Failed to load metrics.</p>;
  }
  if (!metrics) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  const { users, tenants, billing, engagement } = metrics;
  const planSummary = Object.entries(billing.by_plan)
    .map(([plan, count]) => `${plan}: ${count}`)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={String(users.total)} sub={`${users.active_7d} active in 7d`} />
        <StatCard label="New users" value={String(users.new_30d)} sub={`${users.new_7d} in 7d`} />
        <StatCard label="Paid subscriptions" value={String(billing.paid_active)} sub={planSummary || "none yet"} />
        <StatCard label="MRR" value={formatCents(billing.mrr_cents)} sub={`${billing.invoices_paid} invoices paid`} />
        <StatCard label="Revenue (total)" value={formatCents(billing.revenue_total_cents)} />
        <StatCard label="Revenue (30d)" value={formatCents(billing.revenue_30d_cents)} />
        <StatCard label="Workspaces" value={String(tenants.total)} sub={`${tenants.team} team · ${tenants.personal} personal`} />
        <StatCard
          label="Check-ins (14d)"
          value={String(engagement.activity_by_day.reduce((sum, row) => sum + row.n, 0))}
          sub={`${engagement.chat_by_day.reduce((sum, row) => sum + row.n, 0)} chat messages`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <BarChart title="Signups — last 30 days" data={fillDays(users.signups_by_day, 30)} color="bg-primary" />
        <BarChart title="Chat messages — last 14 days" data={fillDays(engagement.chat_by_day, 14)} color="bg-success" />
        <BarChart title="Daily check-ins — last 14 days" data={fillDays(engagement.activity_by_day, 14)} color="bg-warning" />
      </div>
    </div>
  );
}
