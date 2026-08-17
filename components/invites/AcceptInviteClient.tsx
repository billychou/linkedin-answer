"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Status =
  | { kind: "loading" }
  | { kind: "success"; tenantName: string }
  | { kind: "error"; message: string };

/**
 * 邀请接受页：/invites/accept?token=...
 * 页面本身受 middleware 保护（未登录先去 /login，query 保留）。
 * mount 后自动 POST /api/invites/accept，成功则跳转 /settings?tab=team。
 */
export default function AcceptInviteClient() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const attempted = useRef(false);

  const accept = useCallback(async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus({ kind: "error", message: "This invitation link is invalid." });
      return;
    }
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; tenant?: { name: string }; error?: string }
        | null;
      if (res.ok && data?.ok) {
        setStatus({
          kind: "success",
          tenantName: data.tenant?.name ?? "the workspace",
        });
        window.setTimeout(() => {
          window.location.href = "/settings?tab=team";
        }, 1200);
        return;
      }
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
        return;
      }
      setStatus({
        kind: "error",
        message: data?.error ?? "Something went wrong. Please try again.",
      });
    } catch {
      setStatus({ kind: "error", message: "Network error. Please try again." });
    }
  }, []);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void accept();
  }, [accept]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-24 text-center">
      {status.kind === "loading" && (
        <>
          <Loader2 className="h-10 w-10 animate-pulse text-primary" />
          <h1 className="mt-6 text-xl font-semibold">Accepting invitation…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Just a moment.
          </p>
        </>
      )}

      {status.kind === "success" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h1 className="mt-6 text-xl font-semibold">
            Welcome to “{status.tenantName}”!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting you to the team page…
          </p>
        </>
      )}

      {status.kind === "error" && (
        <>
          <MailX className="h-10 w-10 text-muted-foreground" />
          <h1 className="mt-6 text-xl font-semibold">Invitation problem</h1>
          <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
          <Button asChild variant="outline" className="mt-6">
            <a href="/settings?tab=team">Back to settings</a>
          </Button>
        </>
      )}
    </div>
  );
}
