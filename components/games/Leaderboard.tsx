"use client";

import { fetchSession } from "@/lib/authClient";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/activityClient";
import { Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * streak 排行榜（前 10）：仅登录用户可见；无人上榜时不渲染。
 */
export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then(async (user) => {
      if (!user || cancelled) return;
      const leaderboard = await fetchLeaderboard();
      if (!cancelled) setEntries(leaderboard ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-bold">Streak Leaderboard</h2>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <ul className="divide-y">
          {entries.map((entry, index) => (
            <li key={`${entry.name}-${index}`} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`w-6 text-center text-sm font-semibold ${
                  index === 0 ? "text-warning" : "text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              {entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.avatar_url}
                  alt={entry.name}
                  className="h-7 w-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                  {entry.name.slice(0, 1)}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name}</span>
              <span className="inline-flex items-center gap-1 text-sm text-warning">
                <Flame className="h-4 w-4" />
                {entry.current}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                best {entry.best}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Visit any answer page daily to keep your streak going. Hide your name in Settings → Profile.
      </p>
    </section>
  );
}
