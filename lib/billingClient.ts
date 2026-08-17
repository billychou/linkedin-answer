/**
 * 计费系统客户端封装（对接 functions/api/billing/*）。
 * 失败统一返回 null / false，由 UI 层 toast 提示。
 */

export interface BillingPlan {
  id: string;
  name: string;
  billing_interval: "none" | "month" | "year";
  price_cents: number;
  currency: string;
  features: { chatPerDay: number; historyDays: number; priority?: boolean };
}

export interface BillingSubscriptionDetail {
  plan: string;
  plan_name: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  features: { chatPerDay: number; historyDays: number; priority?: boolean };
}

export interface BillingInvoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  paid_at: number | null;
  created_at: number;
}

export interface QuotaInfo {
  plan: string;
  metric: string;
  limit: number;
  used_today: number;
  remaining: number;
}

export async function fetchBillingPlans(): Promise<BillingPlan[] | null> {
  try {
    const res = await fetch("/api/billing/plans");
    if (!res.ok) return null;
    const data = (await res.json()) as { plans: BillingPlan[] };
    return data.plans;
  } catch {
    return null;
  }
}

export async function fetchBillingSubscription(): Promise<{
  subscription: BillingSubscriptionDetail;
  invoices: BillingInvoice[];
} | null> {
  try {
    const res = await fetch("/api/billing/subscription");
    if (!res.ok) return null;
    return (await res.json()) as {
      subscription: BillingSubscriptionDetail;
      invoices: BillingInvoice[];
    };
  } catch {
    return null;
  }
}

/** 发起 Stripe Checkout；billing 未配置时服务端返回 503 → null。 */
export async function startCheckout(planId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function openBillingPortal(): Promise<string | null> {
  try {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchQuota(): Promise<QuotaInfo | null> {
  try {
    const res = await fetch("/api/billing/quota");
    if (!res.ok) return null;
    return (await res.json()) as QuotaInfo;
  } catch {
    return null;
  }
}

export type ConsumeQuotaResult =
  | { ok: true; quota: QuotaInfo }
  | { ok: false; reason: "limit" | "error" };

/**
 * 消耗一次 chat 配额（检查与计数原子完成）。
 * 429 = 超限（reason: "limit"）；网络/服务异常 = reason: "error"，
 * 调用方可选择 fail-open，避免配额服务故障拖垮聊天功能。
 */
export async function consumeChatQuota(): Promise<ConsumeQuotaResult> {
  try {
    const res = await fetch("/api/billing/quota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metric: "chat" }),
    });
    if (res.ok) {
      return { ok: true, quota: (await res.json()) as QuotaInfo };
    }
    return { ok: false, reason: res.status === 429 ? "limit" : "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** GDPR 数据导出：拉取 JSON 并触发浏览器下载。 */
export async function exportMyData(): Promise<boolean> {
  try {
    const res = await fetch("/api/me/export");
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `linkedin-answer-data-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** 注销账号；需要用户输入 DELETE 确认。 */
export async function deleteMyAccount(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
