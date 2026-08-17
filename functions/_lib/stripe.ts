/**
 * 边缘原生 Stripe 客户端（Cloudflare Pages Functions）。
 *
 * 不使用官方 stripe-node（依赖 Node http 模块，Workers 上不可用），
 * 而是直接调用 Stripe REST API（fetch + form-urlencoded），并用
 * Web Crypto 实现 Webhook 签名校验（HMAC-SHA256）。
 *
 * 文档：
 * - API: https://docs.stripe.com/api
 * - Webhook 验签: https://docs.stripe.com/webhooks/signatures
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

/** Webhook 时间戳容忍窗口（秒），与官方 SDK 默认一致。 */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface StripeEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export function isStripeConfigured(env: StripeEnv): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.length > 0);
}

// ---------------------------------------------------------------------------
// REST 调用
// ---------------------------------------------------------------------------

export interface StripeErrorPayload {
  error?: { message?: string; type?: string };
}

export class StripeApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * 通用 Stripe REST 请求。GET 参数拼进 URL；POST 参数 form-urlencoded。
 * 嵌套参数（如 line_items[0][price]）直接用字符串 key 表达。
 */
async function stripeFetch<T>(
  env: StripeEnv,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string | undefined>
): Promise<T> {
  if (!isStripeConfigured(env)) {
    throw new StripeApiError("STRIPE_SECRET_KEY is not configured", 503);
  }
  const clean: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) clean[key] = value;
    }
  }

  let url = `${STRIPE_API_BASE}${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (method === "GET" && Object.keys(clean).length) {
    url += `?${new URLSearchParams(clean).toString()}`;
  } else if (method === "POST") {
    init.body = new URLSearchParams(clean).toString();
  }

  const res = await fetch(url, init);
  const data = (await res.json()) as T & StripeErrorPayload;
  if (!res.ok || data.error) {
    throw new StripeApiError(
      data.error?.message ?? `Stripe API error`,
      res.status
    );
  }
  return data;
}

// ---------------------------------------------------------------------------
// 类型（只声明用到的字段；不同 API 版本字段位置有差异，读取处做兜底）
// ---------------------------------------------------------------------------

export interface StripePrice {
  id: string;
  product?: string;
}

export interface StripeSubscriptionItem {
  id: string;
  price: StripePrice;
  current_period_start?: number;
  current_period_end?: number;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";
  cancel_at_period_end: boolean;
  /** 旧版 API 在订阅对象上；basil 之后移到 items.data[0]。 */
  current_period_start?: number;
  current_period_end?: number;
  items?: { data?: StripeSubscriptionItem[] };
  metadata?: Record<string, string>;
}

export interface StripeCheckoutSession {
  id: string;
  mode: "payment" | "subscription" | "setup";
  client_reference_id?: string | null;
  customer?: string | null;
  customer_details?: { email?: string | null } | null;
  subscription?: string | null;
  metadata?: Record<string, string>;
}

export interface StripeInvoice {
  id: string;
  customer: string;
  subscription?: string | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  hosted_invoice_url?: string | null;
  paid_at?: number | null;
  created: number;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// API 封装
// ---------------------------------------------------------------------------

export function createCustomer(
  env: StripeEnv,
  input: { email: string; name?: string; userId: string }
): Promise<{ id: string }> {
  return stripeFetch(env, "POST", "/customers", {
    email: input.email,
    name: input.name || undefined,
    "metadata[user_id]": input.userId,
  });
}

export function createCheckoutSession(
  env: StripeEnv,
  input: {
    customerId: string;
    priceId: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<{ id: string; url: string | null }> {
  return stripeFetch(env, "POST", "/checkout/sessions", {
    mode: "subscription",
    customer: input.customerId,
    client_reference_id: input.userId,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    "subscription_data[metadata][user_id]": input.userId,
    "metadata[user_id]": input.userId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: "true",
  });
}

export function createBillingPortalSession(
  env: StripeEnv,
  input: { customerId: string; returnUrl: string }
): Promise<{ id: string; url: string }> {
  return stripeFetch(env, "POST", "/billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.returnUrl,
  });
}

export function getSubscription(
  env: StripeEnv,
  subscriptionId: string
): Promise<StripeSubscription> {
  return stripeFetch(env, "GET", `/subscriptions/${subscriptionId}`);
}

/**
 * 兼容不同 API 版本的周期字段位置：
 * 优先订阅对象顶层，回退到 items.data[0]，再回退到 [now, now+30d]。
 */
export function subscriptionPeriod(sub: StripeSubscription): {
  start: number;
  end: number;
} {
  const item = sub.items?.data?.[0];
  const now = Math.floor(Date.now() / 1000);
  return {
    start: sub.current_period_start ?? item?.current_period_start ?? now,
    end:
      sub.current_period_end ?? item?.current_period_end ?? now + 30 * 86400,
  };
}

/** 从订阅对象中取主 Price ID（用于匹配本地 plans.stripe_price_id）。 */
export function subscriptionPriceId(sub: StripeSubscription): string | null {
  return sub.items?.data?.[0]?.price?.id ?? null;
}

// ---------------------------------------------------------------------------
// Webhook 签名校验（Web Crypto HMAC-SHA256）
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 常数时间字符串比较，避免时序攻击。 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 校验 `stripe-signature` 头。
 * 头格式：`t=<unix秒>,v1=<hex hmac>,v1=<可能多个>`；
 * 签名内容：`<t>.<原始请求体>`。
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = WEBHOOK_TOLERANCE_SECONDS
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const drift = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (drift > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
  const expected = bytesToHex(new Uint8Array(mac));

  return signatures.some((sig) => timingSafeEqual(expected, sig));
}
