"use client";

import { fetchProfile, fetchSession, logout } from "@/lib/authClient";
import { useUserStore } from "@/stores/userStore";
import type { ProfileUser } from "@/types/user";
import { useEffect, useState } from "react";
import { AccountSection } from "./AccountSection";
import { DataSection } from "./DataSection";
import { ProfileForm } from "./ProfileForm";
import { SubscriptionSection } from "./SubscriptionSection";
import { TeamSection } from "./TeamSection";

type Tab = "profile" | "account" | "team" | "subscription" | "data";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "team", label: "Team" },
  { id: "subscription", label: "Subscription" },
  { id: "data", label: "Data & Privacy" },
];

/**
 * Settings page: requires a valid session. On mount it syncs the session
 * and loads the full profile from /api/me; unauthenticated visitors are
 * redirected to /login?next=/settings.
 */
export default function SettingsClient() {
  const sessionUser = useUserStore((state) => state.user);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((user) => {
      if (cancelled) return;
      if (!user) {
        const next = window.location.pathname;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      void fetchProfile().then((profile) => {
        if (cancelled) return;
        setProfile(profile);
        setStatus(profile ? "ready" : "error");
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || !profile) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-12 space-y-6">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-semibold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Failed to load your profile. Please try again later.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, account, and preferences.
        </p>
      </div>

      <div className="flex gap-1 border-b" role="tablist" aria-label="Settings sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "profile" && (
          <ProfileForm profile={profile} onChange={setProfile} />
        )}
        {tab === "account" && <AccountSection profile={profile} />}
        {tab === "team" && (
          <TeamSection profile={profile} onChange={setProfile} />
        )}
        {tab === "subscription" && (
          <SubscriptionSection profile={profile} />
        )}
        {tab === "data" && <DataSection />}
      </div>
    </div>
  );
}
