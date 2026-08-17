import {
  getRequestUser,
  jsonResponse,
  siteBaseUrl,
  type AuthEnv,
} from "../../_lib/auth";
import { getOrCreateStripeCustomer } from "../../_lib/billing";
import { rateLimitOr429 } from "../../_lib/rateLimit";
import {
  createBillingPortalSession,
  isStripeConfigured,
} from "../../_lib/stripe";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * POST /api/billing/portal → { url }
 * 打开 Stripe Billing Portal（改支付方式、取消/恢复订阅、看发票）。
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

  const limited = await rateLimitOr429(env, request, "billing/portal", 20, 3600);
  if (limited) return limited;

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!isStripeConfigured(env)) {
    return jsonResponse({ error: "Billing is not configured yet" }, 503);
  }

  try {
    const customerId = await getOrCreateStripeCustomer(envWithDb, auth.user);
    const session = await createBillingPortalSession(env, {
      customerId,
      returnUrl: `${siteBaseUrl(env, request)}/settings?tab=subscription`,
    });
    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal failed";
    return jsonResponse({ error: message }, 502);
  }
};
