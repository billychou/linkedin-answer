import { getAnswersByGameSlug } from "@/lib/answers";
import { Game } from "@/types/game";
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Crown,
  Crosshair,
  ExternalLink,
  Hash,
  Moon,
  Puzzle,
  Route,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

interface GameCardProps {
  game: Game;
}

const icons: Record<string, LucideIcon> = {
  pinpoint: Crosshair,
  patches: Puzzle,
  zip: Route,
  tango: Moon,
  queens: Crown,
  crossclimb: ArrowUpDown,
  "mini-sudoku": Hash,
};

const accents: Record<string, { chip: string; text: string }> = {
  blue: {
    chip: "bg-blue-600/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400",
    text: "text-blue-700 dark:text-blue-400",
  },
  green: {
    chip: "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  violet: {
    chip: "bg-violet-600/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-400",
    text: "text-violet-700 dark:text-violet-400",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
    text: "text-amber-700 dark:text-amber-400",
  },
  pink: {
    chip: "bg-pink-600/10 text-pink-700 dark:bg-pink-400/15 dark:text-pink-400",
    text: "text-pink-700 dark:text-pink-400",
  },
  orange: {
    chip: "bg-orange-600/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-400",
    text: "text-orange-700 dark:text-orange-400",
  },
};

export default function GameCard({ game }: GameCardProps) {
  const Icon = icons[game.slug] ?? Crosshair;
  const accent = accents[game.color ?? "blue"] ?? accents.blue;
  const archiveCount = getAnswersByGameSlug(game.slug).length;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent.chip}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {archiveCount}+ archives
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-bold text-foreground">
        {game.name.replace("LinkedIn ", "")}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{game.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Link
          href={`/games/${game.slug}`}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${accent.text}`}
        >
          Today&apos;s answer
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Link
            href={`/games/${game.slug}/archives`}
            title="Archives"
            aria-label={`${game.name} archives`}
            className="transition-colors hover:text-foreground"
          >
            <Archive className="h-4 w-4" />
          </Link>
          <Link
            href={`/games/${game.slug}/how-to-play`}
            title="How to play"
            aria-label={`How to play ${game.name}`}
            className="transition-colors hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" />
          </Link>
          {game.playUrl && (
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Play on LinkedIn"
              aria-label={`Play ${game.name} on LinkedIn`}
              className="transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
