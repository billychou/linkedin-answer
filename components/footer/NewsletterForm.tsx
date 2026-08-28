"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || status === "loading") return;

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "footer" }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("You're in! Check your inbox for a welcome email.");
        setEmail("");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus("error");
        setMessage(data?.error ?? "Subscription failed, please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error, please try again.");
    }
  }

  return (
    <div className="w-full border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Get today&apos;s answers in your inbox
            </p>
            <p className="text-xs text-muted-foreground">
              One short email per day with all seven game answers. Free, unsubscribe anytime.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        </div>
        {message && (
          <p
            role="status"
            className={`mt-3 text-xs ${
              status === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
