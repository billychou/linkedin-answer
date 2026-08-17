import { getRequestUser, jsonResponse, type AuthEnv } from "../../../_lib/auth";
import {
  getEntitlements,
  listInvoicesForUser,
} from "../../../_lib/billing";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * GET /api/billing/subscription — 当前订阅、权益与发票。
 * 前端唯一可信的订阅信息来源（不信任 Stripe 返回值）。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const entitlements = await getEntitlements(env.DB!, auth.user.id);
  const invoices = await listInvoicesForUser(env.DB!, auth.user.id);
  return jsonResponse({
    subscription: {
      plan: entitlements.planId,
      plan_name: entitlements.planName,
      status: entitlements.status,
      cancel_at_period_end: entitlements.cancelAtPeriodEnd,
      current_period_end: entitlements.currentPeriodEnd,
      features: entitlements.features,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      amount_cents: invoice.amount_cents,
      currency: invoice.currency,
      status: invoice.status,
      hosted_invoice_url: invoice.hosted_invoice_url,
      paid_at: invoice.paid_at,
      created_at: invoice.created_at,
    })),
  });
};
