import { jsonResponse } from "../../_lib/auth";
import type { D1Database } from "../../_lib/db";
import { sendEmail, siteUrl, type EmailEnv } from "../../_lib/email";
import { newsletterWelcomeEmail } from "../../_lib/emailTemplates";
import {
  normalizeEmail,
  upsertSubscription,
  type DbSubscription,
} from "../../_lib/newsletter";
import { rateLimitOr429, type RateLimitEnv } from "../../_lib/rateLimit";
import { z } from "zod";

interface Context {
  request: Request;
  env: EmailEnv & RateLimitEnv & { DB?: D1Database };
  waitUntil?: (promise: Promise<unknown>) => void;
}

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email")
    .max(254),
  source: z.string().trim().max(50).optional(),
});

function unsubscribeUrl(base: string, token: string): string {
  return `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * POST /api/newsletter/subscribe — 订阅每日答案摘要。
 * 幂等：重复订阅视为成功；已退订的邮箱重新订阅即恢复。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const limited = await rateLimitOr429(env, request, "newsletter/subscribe", 10, 3600);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      400
    );
  }

  const email = normalizeEmail(parsed.data.email);
  let subscription: DbSubscription;
  try {
    const result = await upsertSubscription(
      env.DB,
      email,
      parsed.data.source || "footer"
    );
    subscription = result.subscription;
  } catch {
    return jsonResponse({ error: "Failed to subscribe, please try again" }, 500);
  }

  const base = siteUrl(env);
  const emailContent = newsletterWelcomeEmail({
    siteUrl: base,
    unsubscribeUrl: unsubscribeUrl(base, subscription.token),
  });
  const sendPromise = sendEmail(env, {
    to: subscription.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
  // 欢迎邮件异步发送，不阻塞订阅响应。
  if (context.waitUntil) {
    context.waitUntil(sendPromise);
  } else {
    void sendPromise;
  }

  return jsonResponse({ ok: true }, 201);
};
