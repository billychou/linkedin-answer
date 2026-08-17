"use client";

import { Button } from "@/components/ui/button";
import { fetchProfile } from "@/lib/authClient";
import { CalendarDays, MessageCircle, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Build your streak",
    body: "Visit any answer daily to keep your streak alive and climb the leaderboard.",
  },
  {
    icon: MessageCircle,
    title: "Ask the AI assistant",
    body: "Stuck on a clue? Chat helps you reason through it — 5 free messages a day.",
  },
  {
    icon: Users,
    title: "Play with your team",
    body: "Create a workspace and invite teammates to share the fun.",
  },
];

/**
 * 首次登录引导卡：登录后未 onboarded 时在首页展示，关闭后写入
 * users.onboarded_at（只写一次），不再出现。
 */
export default function OnboardingBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchProfile().then((profile) => {
      if (!cancelled && profile && !profile.onboarded_at) {
        setVisible(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setDismissing(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarded: true }),
      });
    } catch {
      /* 关闭失败不阻断：下次仍会提示 */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="relative rounded-xl border bg-card p-6 shadow-sm">
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={dismissing}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Dismiss welcome guide"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold">Welcome! Make the most of it</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three quick ways to get more from LinkedIn Answer Today.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border bg-background p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/pricing">See Pro plans</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings?tab=team">Invite teammates</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void dismiss()}>
            Got it
          </Button>
        </div>
      </div>
    </section>
  );
}
