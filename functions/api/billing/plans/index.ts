import { jsonResponse, type AuthEnv } from "../../../_lib/auth";
import { listActivePlans } from "../../../_lib/billing";

interface Context {
  request: Request;
  env: AuthEnv;
}

/** GET /api/billing/plans — 公开套餐目录（定价页与升级弹窗用）。 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  const plans = await listActivePlans(env.DB);
  return jsonResponse({
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      billing_interval: plan.billing_interval,
      price_cents: plan.price_cents,
      currency: plan.currency,
      features: JSON.parse(plan.features_json),
    })),
  });
};
