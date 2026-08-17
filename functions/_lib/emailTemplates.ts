/**
 * 交易类邮件 HTML 模板（纯字符串，边缘可渲染，无 React 依赖）。
 * 视觉风格与 emails/*.tsx 保持一致（Inter、卡片式、浅色背景）。
 */

import { escapeHtml } from "./email";

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface ShellOptions {
  title: string;
  bodyHtml: string;
  footerText?: string;
}

/** 邮件外壳：灰色背景 + 白色卡片。 */
function shell({ title, bodyHtml, footerText }: ShellOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f8fafc;">
    <div style="font-family:${FONT_STACK};max-width:600px;margin:0 auto;background-color:#f8fafc;padding:40px 20px;">
      <div style="background-color:#ffffff;border-radius:12px;padding:40px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <h1 style="font-size:22px;font-weight:700;color:#1e293b;margin:0 0 20px;">${title}</h1>
        ${bodyHtml}
      </div>
      ${
        footerText
          ? `<p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:24px;">${footerText}</p>`
          : ""
      }
    </div>
  </body>
</html>`;
}

const P = (text: string) =>
  `<p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 16px;">${text}</p>`;

const BUTTON = (href: string, label: string) =>
  `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">${label}</a>
  </p>`;

export function tenantInviteEmail(input: {
  tenantName: string;
  inviterName: string;
  inviteUrl: string;
  expiresDays: number;
}): { subject: string; html: string; text: string } {
  const tenant = escapeHtml(input.tenantName);
  const inviter = escapeHtml(input.inviterName || "A teammate");
  const subject = `${input.inviterName || "A teammate"} invited you to "${input.tenantName}"`;
  const html = shell({
    title: "You're invited 👋",
    bodyHtml:
      P(`${inviter} invited you to join the <strong>${tenant}</strong> workspace on LinkedIn Answer Today.`) +
      BUTTON(input.inviteUrl, "Accept invitation") +
      P(
        `Or paste this link into your browser:<br/><a href="${input.inviteUrl}" style="color:#2563eb;word-break:break-all;">${input.inviteUrl}</a>`
      ) +
      P(`This invitation expires in ${input.expiresDays} days. If you weren't expecting it, you can safely ignore this email.`),
    footerText: "LinkedIn Answer Today — daily LinkedIn game answers & AI chat",
  });
  const text = `${inviter} invited you to join "${tenant}" on LinkedIn Answer Today.\n\nAccept here: ${input.inviteUrl}\n\nThis invitation expires in ${input.expiresDays} days.`;
  return { subject, html, text };
}

export function paymentReceiptEmail(input: {
  userName: string;
  amountLabel: string;
  planName: string;
  invoiceUrl: string | null;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.userName || "there");
  const subject = `Receipt for your ${input.planName} subscription`;
  const invoiceLink = input.invoiceUrl
    ? BUTTON(input.invoiceUrl, "View invoice")
    : "";
  const html = shell({
    title: "Payment received — thank you!",
    bodyHtml:
      P(`Hi ${name},`) +
      P(
        `We received your payment of <strong>${escapeHtml(input.amountLabel)}</strong> for the <strong>${escapeHtml(input.planName)}</strong> plan. Your subscription is active.`
      ) +
      invoiceLink +
      P(`Manage your subscription anytime from <a href="${input.siteUrl}/settings?tab=subscription" style="color:#2563eb;">your billing settings</a>.`),
    footerText: "LinkedIn Answer Today — thanks for supporting the site!",
  });
  const text = `Hi ${name}, we received your payment of ${input.amountLabel} for the ${input.planName} plan.${input.invoiceUrl ? `\n\nInvoice: ${input.invoiceUrl}` : ""}\n\nManage billing: ${input.siteUrl}/settings?tab=subscription`;
  return { subject, html, text };
}

export function paymentFailedEmail(input: {
  userName: string;
  amountLabel: string;
  planName: string;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.userName || "there");
  const subject = `Action needed: your ${input.planName} payment failed`;
  const html = shell({
    title: "Payment failed — action needed",
    bodyHtml:
      P(`Hi ${name},`) +
      P(
        `We couldn't process your payment of <strong>${escapeHtml(input.amountLabel)}</strong> for the <strong>${escapeHtml(input.planName)}</strong> plan. Your card may have expired or the payment was declined.`
      ) +
      P("Please update your payment method to keep your Pro benefits active. Stripe will retry the charge automatically over the next few days.") +
      BUTTON(`${input.siteUrl}/settings?tab=subscription`, "Update payment method"),
    footerText: "LinkedIn Answer Today — questions? Just reply to this email.",
  });
  const text = `Hi ${name}, we couldn't process your payment of ${input.amountLabel} for the ${input.planName} plan.\n\nUpdate your payment method: ${input.siteUrl}/settings?tab=subscription`;
  return { subject, html, text };
}

/** 金额格式化：599 + usd → "$5.99"。 */
export function formatAmount(cents: number, currency: string): string {
  const major = (cents / 100).toFixed(2);
  const code = currency.toUpperCase();
  if (code === "USD") return `$${major}`;
  if (code === "EUR") return `€${major}`;
  if (code === "GBP") return `£${major}`;
  // JPY 等零小数货币：Stripe 金额本身就是最小单位（円），不除 100。
  if (code === "JPY") return `¥${cents}`;
  return `${major} ${code}`;
}
