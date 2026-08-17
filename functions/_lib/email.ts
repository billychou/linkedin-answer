/**
 * 边缘邮件发送（Resend REST API）。
 *
 * 与 stripe.ts 同理：不引入 SDK，直接 fetch Resend 的 /emails 接口，
 * 保证在 Cloudflare Pages Functions 上可用。
 * 未配置 RESEND_API_KEY 时静默跳过（返回 false），不阻断业务流程。
 *
 * 文档：https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API = "https://api.resend.com/emails";

export interface EmailEnv {
  RESEND_API_KEY?: string;
  /** 发件人，如 "LinkedIn Answer Today <noreply@yourdomain.com>"。 */
  EMAIL_FROM?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

/** 默认发件人：Resend 沙箱域（只能发到自己账号邮箱），生产务必配置 EMAIL_FROM。 */
const DEFAULT_FROM = "LinkedIn Answer Today <onboarding@resend.dev>";

export function isEmailConfigured(env: EmailEnv): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_API_KEY.length > 0);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** 纯文本兜底（不支持 HTML 的客户端）。 */
  text?: string;
}

/** 发送邮件；失败只记录日志、不抛错。返回是否成功。 */
export async function sendEmail(
  env: EmailEnv,
  input: SendEmailInput
): Promise<boolean> {
  if (!isEmailConfigured(env)) {
    console.info(
      `[email] RESEND_API_KEY not configured, skip sending "${input.subject}" to ${input.to}`
    );
    return false;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")) || "";
      console.error(`[email] send failed (${res.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] send error: ${message}`);
    return false;
  }
}

/** 站点绝对 URL（邮件内链接用）。 */
export function siteUrl(env: EmailEnv): string {
  return (env.NEXT_PUBLIC_SITE_URL || "http://localhost:8788").replace(/\/+$/, "");
}

/** HTML 转义，防止邮箱/租户名注入邮件结构。 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
