import type { D1Database } from "../../_lib/db";
import { siteUrl, type EmailEnv } from "../../_lib/email";
import { unsubscribeByToken } from "../../_lib/newsletter";
import { rateLimitOr429, type RateLimitEnv } from "../../_lib/rateLimit";

interface Context {
  request: Request;
  env: EmailEnv & RateLimitEnv & { DB?: D1Database };
}

const PAGE_HTML = (siteRoot: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Unsubscribed — LinkedIn Answer Today</title>
  <style>
    body { margin: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 480px; margin: 12vh auto; padding: 0 20px; text-align: center; color: #334155; }
    h1 { font-size: 22px; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #64748b; }
    a.button { display: inline-block; margin-top: 24px; padding: 12px 28px; border-radius: 8px; background: #2563eb; color: #fff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>You're unsubscribed</h1>
    <p>You will no longer receive email updates from LinkedIn Answer Today. If this was a mistake, you can subscribe again anytime from the footer of the site.</p>
    <a class="button" href="${siteRoot}/games">Back to today's answers</a>
  </main>
</body>
</html>`;

/**
 * GET /api/newsletter/unsubscribe?token=... — 一键退订（邮件链接直达）。
 * 无论 token 是否有效都返回同一个成功页，避免泄露 token 存在性。
 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!env.DB) {
    return new Response("Service unavailable", { status: 503 });
  }

  const limited = await rateLimitOr429(env, request, "newsletter/unsubscribe", 30, 3600);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token) {
    try {
      await unsubscribeByToken(env.DB, token);
    } catch (error) {
      console.error(
        `[newsletter] unsubscribe error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return new Response(PAGE_HTML(siteUrl(env)), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
