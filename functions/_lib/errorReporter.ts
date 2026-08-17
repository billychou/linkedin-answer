/**
 * 边缘错误上报（Cloudflare Pages Functions）。
 *
 * 两层：
 * 1. 始终输出结构化 JSON 到 console.error —— Cloudflare Dashboard 的
 *    Workers 日志可直接检索；
 * 2. 配置了 SENTRY_DSN 时，额外以最小协议转发到 Sentry store API
 *    （不引入 SDK，best-effort，失败只降级为本地日志）。
 *
 * 未配置 DSN 也能用：先把"看得见错误"这件事做起来，DSN 后补即可。
 */

export interface ErrorReportEnv {
  SENTRY_DSN?: string;
}

interface ReportExtra {
  /** 业务上下文标识，如 "stripe-webhook:event-id" / "billing/checkout"。 */
  context: string;
  [key: string]: unknown;
}

function parseDsn(dsn: string): { key: string; host: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/^\//, "").split("/")[0];
    if (!key || !projectId) return null;
    return { key, host: url.host, projectId };
  } catch {
    return null;
  }
}

/** 非阻塞发送到 Sentry；任何失败都静默降级。 */
async function forwardToSentry(
  dsn: string,
  error: unknown,
  extra: ReportExtra
): Promise<void> {
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const body = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    environment: "edge",
    logger: "pages-functions",
    message,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: message,
          stacktrace: { frames: [{ filename: "edge", function: stack.split("\n")[1]?.trim() ?? "unknown" }] },
        },
      ],
    },
    tags: { context: extra.context },
  };

  try {
    await fetch(`https://${parsed.host}/api/${parsed.projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=edge-reporter/1.0`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort：本地日志已兜底。
  }
}

/**
 * 上报错误。调用方无需 await（内部自处理），但 await 也可以。
 */
export async function reportError(
  env: ErrorReportEnv,
  error: unknown,
  extra: ReportExtra
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  // 结构化日志：Cloudflare Dashboard 日志检索友好。
  console.error(
    JSON.stringify({
      level: "error",
      context: extra.context,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      ...Object.fromEntries(
        Object.entries(extra).filter(([key]) => key !== "context")
      ),
    })
  );
  if (env.SENTRY_DSN) {
    await forwardToSentry(env.SENTRY_DSN, error, extra);
  }
}
