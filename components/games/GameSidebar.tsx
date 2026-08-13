import { getAllGames } from "@/lib/games";
import { Game, GameAnswer } from "@/types/game";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import ShareButtons from "./ShareButtons";

interface GameSidebarProps {
  game: Game;
  answer?: GameAnswer;
  allAnswers: GameAnswer[]; // sorted date desc
}

const card = "rounded-2xl border border-border bg-card p-5 shadow-card";

export default function GameSidebar({ game, answer, allAnswers }: GameSidebarProps) {
  const idx = answer ? allAnswers.findIndex((a) => a.date === answer.date) : -1;
  const older = idx >= 0 && idx < allAnswers.length - 1 ? allAnswers[idx + 1] : null;
  const newer = idx > 0 ? allAnswers[idx - 1] : null;
  const otherGames = getAllGames().filter((g) => g.slug !== game.slug);

  const navBtn =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

  return (
    <aside className="grid gap-4 lg:sticky lg:top-20">
      {/* Date navigation */}
      <div className={card}>
        <div className="flex items-center gap-2 font-display font-bold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" /> Browse dates
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            href={older ? `/games/${game.slug}/${older.date}` : "#"}
            aria-disabled={!older}
            className={`${navBtn} ${!older ? "pointer-events-none opacity-40" : ""}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Link>
          <Link href={`/games/${game.slug}`} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
            Today
          </Link>
          <Link
            href={newer ? `/games/${game.slug}/${newer.date}` : "#"}
            aria-disabled={!newer}
            className={`${navBtn} ${!newer ? "pointer-events-none opacity-40" : ""}`}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {answer && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {new Date(answer.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Play CTA */}
      {game.playUrl && (
        <div className={card}>
          <div className="font-display font-bold text-foreground">Play it yourself</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Try today&apos;s puzzle on LinkedIn before peeking.
          </p>
          <a
            href={game.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-primary/90"
          >
            Open LinkedIn {game.name.replace("LinkedIn ", "")} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* More today */}
      <div className={card}>
        <div className="font-display font-bold text-foreground">More today</div>
        <div className="mt-3 grid gap-1 text-sm">
          {otherGames.slice(0, 5).map((g) => (
            <Link
              key={g.slug}
              href={`/games/${g.slug}`}
              className="flex items-center justify-between rounded-lg px-3 py-2 font-medium transition hover:bg-muted"
            >
              <span>{g.name.replace("LinkedIn ", "")}</span>
              <span className="text-muted-foreground">→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Share */}
      <div className={card}>
        <div className="flex items-center gap-2 font-display font-bold text-foreground">
          <Share2 className="h-4 w-4 text-primary" /> Share
        </div>
        <div className="mt-3">
          <ShareButtons />
        </div>
      </div>
    </aside>
  );
}
