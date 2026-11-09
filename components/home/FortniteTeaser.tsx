import { getCurrentGoldWeek } from "@/data/fortnite/weeklyGoldOutfit";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

/** "2026-11-08" → "Nov 8, 2026"(UTC 解析,与独立内页保持一致) */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** 首页 Fortnite 周更金色服装介绍卡:内容概述 + 指向 /fortnite/weekly-gold-outfit 的内链 */
export default function FortniteTeaser() {
  const { current, isLive } = getCurrentGoldWeek();

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-card p-6 shadow-xl shadow-amber-500/5 dark:border-amber-400/30 dark:from-amber-400/10 dark:to-card sm:p-8">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/15 p-2.5 dark:bg-amber-400/15">
          <Sparkles className="h-6 w-6 text-amber-500 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Fortnite Weekly Gold Outfit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This week&apos;s free Solid Gold skin, tracked for you
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Every week, Fortnite puts one{" "}
        <strong className="text-foreground">Solid Gold</strong> outfit into the
        Battle Royale Treasure Chest pool as a completely free random drop — no
        purchase, no Battle Pass tier, no quest chain. We track which gold
        outfit is live this week, the reported drop odds, and every past week
        of the rotation.
      </p>

      {current && (
        <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-card/70 px-4 py-2.5 text-sm text-muted-foreground dark:border-amber-400/30">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive ? "animate-pulse bg-success" : "bg-warning"
            }`}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">
            {current.outfitName}
          </span>
          <span>
            · {current.weekLabel} · {formatDay(current.date)} –{" "}
            {formatDay(current.endDate)}
          </span>
        </p>
      )}

      <div className="mt-6">
        <Link
          href="/fortnite/weekly-gold-outfit"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white shadow-lift transition hover:bg-amber-600 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300"
        >
          See this week&apos;s gold outfit <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
