import { jsonResponse } from "../../_lib/auth";
import type { D1Database } from "../../_lib/db";
import { sendEmail, siteUrl, type EmailEnv } from "../../_lib/email";
import { dailyDigestEmail } from "../../_lib/emailTemplates";
import {
  listActiveSubscriptions,
  markDigestSent,
} from "../../_lib/newsletter";

interface Context {
  request: Request;
  env: EmailEnv & { DB?: D1Database; NEWSLETTER_CRON_SECRET?: string };
  waitUntil?: (promise: Promise<unknown>) => void;
}

function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

function authorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  if (request.headers.get("x-cron-secret") === secret) return true;
  const bearer = request.headers.get("authorization") ?? "";
  return bearer === `Bearer ${secret}`;
}

/**
 * POST /api/newsletter/digest — 给所有活跃订阅者发送当日答案摘要。
 * 由 GitHub Actions 定时触发（.github/workflows/newsletter-digest.yml），
 * 以 x-cron-secret 头携带 NEWSLETTER_CRON_SECRET；未配置密钥时端点关闭。
 * 按 last_digest_date 去重：同一 UTC 日重复触发不会重复发送。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  if (!env.NEWSLETTER_CRON_SECRET) {
    return jsonResponse(
      { error: "NEWSLETTER_CRON_SECRET is not configured; digest disabled" },
      503
    );
  }
  if (!authorized(request, env.NEWSLETTER_CRON_SECRET)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const todayUtc = todayUtcString();
  const subscriptions = await listActiveSubscriptions(env.DB);
  const due = subscriptions.filter((s) => s.last_digest_date !== todayUtc);

  if (due.length === 0) {
    return jsonResponse({ date: todayUtc, sent: 0, skipped: subscriptions.length });
  }

  const base = siteUrl(env);
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  let sent = 0;
  let failed = 0;
  for (const sub of due) {
    const unsubscribe = `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(sub.token)}`;
    const content = dailyDigestEmail({
      dateLabel,
      siteUrl: base,
      unsubscribeUrl: unsubscribe,
    });
    const ok = await sendEmail(env, {
      to: sub.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (ok) {
      sent += 1;
      await markDigestSent(env.DB, sub.id, todayUtc);
    } else {
      // 发送失败（含未配置邮件服务）：不标记已发送，重跑可补发。
      failed += 1;
    }
  }

  return jsonResponse({
    date: todayUtc,
    sent,
    failed,
    skipped: subscriptions.length - due.length,
  });
};
