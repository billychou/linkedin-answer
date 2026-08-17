import { jsonResponse, type AuthEnv } from "../../_lib/auth";
import {
  claimWebhookEvent,
  getPlanById,
  getSubscriptionByStripeId,
  getUserByStripeCustomer,
  recordInvoiceFromStripe,
  syncSubscriptionFromStripe,
} from "../../_lib/billing";
import type { D1Database } from "../../_lib/db";
import { sendEmail, siteUrl, type EmailEnv } from "../../_lib/email";
import {
  formatAmount,
  paymentFailedEmail,
  paymentReceiptEmail,
} from "../../_lib/emailTemplates";
import {
  getSubscription,
  verifyStripeSignature,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from "../../_lib/stripe";

interface Context {
  request: Request;
  env: AuthEnv & EmailEnv;
}

/** 事件处理失败只记录、不向 Stripe 抛错（避免无意义重试风暴）。 */
function logError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[stripe-webhook] ${where}: ${message}`);
}

async function handleSubscriptionEvent(
  env: AuthEnv,
  db: D1Database,
  sub: StripeSubscription
): Promise<void> {
  const user = await getUserByStripeCustomer(db, sub.customer);
  if (!user) {
    console.warn(
      `[stripe-webhook] no user for customer ${sub.customer}, skipping`
    );
    return;
  }
  const synced = await syncSubscriptionFromStripe(db, user, sub);
  if (!synced) {
    console.warn(
      `[stripe-webhook] subscription ${sub.id} price not mapped to any plan`
    );
  }
}

async function handleCheckoutCompleted(
  env: AuthEnv,
  db: D1Database,
  session: StripeCheckoutSession
): Promise<void> {
  if (session.mode !== "subscription" || !session.subscription) return;
  try {
    // Checkout Session 只带订阅 ID，完整对象需要回查一次。
    const sub = await getSubscription(env, session.subscription);
    await handleSubscriptionEvent(env, db, sub);
  } catch (error) {
    // 回查失败不致命：customer.subscription.created 事件会再次同步。
    logError(`checkout fetch subscription ${session.subscription}`, error);
  }
}

async function handleInvoiceEvent(
  env: AuthEnv & EmailEnv,
  db: D1Database,
  invoice: StripeInvoice,
  eventType: string
): Promise<void> {
  const user = await getUserByStripeCustomer(db, invoice.customer);
  if (!user) {
    console.warn(
      `[stripe-webhook] invoice ${invoice.id}: no user for customer ${invoice.customer}`
    );
    return;
  }

  // 本地订阅行 → 关联发票 + 套餐名（发票邮件展示用）。
  const localSub = invoice.subscription
    ? await getSubscriptionByStripeId(db, invoice.subscription)
    : null;
  let planName = "Pro";
  if (localSub) {
    const plan = await getPlanById(db, localSub.plan_id);
    if (plan) planName = plan.name;
  }
  await recordInvoiceFromStripe(db, user.id, localSub?.id ?? null, invoice);

  // 交易类邮件：收据（invoice.paid）/ 扣款失败提醒（invoice.payment_failed）。
  const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
  const amountLabel = formatAmount(amount, invoice.currency);
  if (eventType === "invoice.paid" && amount > 0) {
    const email = paymentReceiptEmail({
      userName: user.name,
      amountLabel,
      planName,
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      siteUrl: siteUrl(env),
    });
    await sendEmail(env, {
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } else if (eventType === "invoice.payment_failed") {
    const email = paymentFailedEmail({
      userName: user.name,
      amountLabel,
      planName,
      siteUrl: siteUrl(env),
    });
    await sendEmail(env, {
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}

/**
 * POST /api/stripe/webhook — Stripe 事件回调。
 *
 * 安全链：原始 body 验签（HMAC-SHA256）→ webhook_events 幂等 → 分派。
 * 验签失败 400；其余情况（含未知事件/业务错误）均 200，
 * 保证 Stripe 不会因偶发业务问题无限重试。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Webhook secret is not configured" }, 500);
  }

  // 验签必须使用未修改的原始请求体。
  const rawBody = await request.text();
  const valid = await verifyStripeSignature(
    rawBody,
    request.headers.get("stripe-signature"),
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) {
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const db = env.DB;
  const claimed = await claimWebhookEvent(db, event.id, event.type, rawBody);
  if (!claimed) {
    // 重复投递：直接确认。
    return jsonResponse({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          env,
          db,
          event.data.object as unknown as StripeCheckoutSession
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(
          env,
          db,
          event.data.object as unknown as StripeSubscription
        );
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as StripeInvoice;
        await handleInvoiceEvent(env, db, invoice, event.type);
        break;
      }
      case "customer.deleted": {
        const customer = event.data.object as { id?: string };
        if (customer.id) {
          await db
            .prepare(
              `UPDATE users SET stripe_customer_id = NULL, updated_at = ?
               WHERE stripe_customer_id = ?`
            )
            .bind(Date.now(), customer.id)
            .run();
        }
        break;
      }
      default:
        // 未处理事件类型：已记录在 webhook_events，直接确认。
        break;
    }
  } catch (error) {
    logError(`event ${event.id} (${event.type})`, error);
  }

  return jsonResponse({ received: true });
};
