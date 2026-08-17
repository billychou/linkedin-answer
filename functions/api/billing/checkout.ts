import {
  getRequestUser,
  jsonResponse,
  siteBaseUrl,
  type AuthEnv,
} from "../../_lib/auth";
import { getOrCreateStripeCustomer, getPlanById } from "../../_lib/billing";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import { createCheckoutSession, isStripeConfigured } from "../../_lib/stripe";
import { z } from "zod";
import { reportError, type ErrorReportEnv } from "../../_lib/errorReporter";

interface Context {
  request: Request;
  env: AuthEnv & ErrorReportEnv;
}

const bodySchema = z
  .object({ planId: z.enum(["pro_monthly", "pro_yearly"]) })
  .strict();

/**
 * POST /api/billing/checkout { planId } → { url }
 * 创建 Stripe Checkout Session（subscription 模式）并返回跳转 URL。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  const envWithDb = { ...env, DB: env.DB };

  const limited = await rateLimitOr429(env, request, "billing/checkout", 10, 3600);
  if (limited) return limited;

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid plan id" }, 400);
  }

  if (!isStripeConfigured(env)) {
    return jsonResponse(
      { error: "Billing is not configured yet" },
      503
    );
  }

  const plan = await getPlanById(env.DB, parsed.data.planId);
  if (!plan || plan.is_active !== 1 || !plan.stripe_price_id) {
    return jsonResponse(
      { error: "Plan is not available for purchase" },
      400
    );
  }

  const base = siteBaseUrl(env, request);
  try {
    const customerId = await getOrCreateStripeCustomer(envWithDb, auth.user);
    const session = await createCheckoutSession(env, {
      customerId,
      priceId: plan.stripe_price_id,
      userId: auth.user.id,
      successUrl: `${base}/settings?tab=subscription&checkout=success`,
      cancelUrl: `${base}/pricing?checkout=canceled`,
    });
    if (!session.url) {
      return jsonResponse({ error: "Stripe did not return a checkout URL" }, 502);
    }
    return jsonResponse({ url: session.url });
  } catch (error) {
    void reportError(env, error, { context: "billing/checkout", userId: auth.user.id });
    const message = error instanceof Error ? error.message : "Checkout failed";
    return jsonResponse({ error: message }, 502);
  }
};
