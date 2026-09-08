import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import type { MiniGame } from "@/data/miniGames";
import {
  miniGameColorMap,
  miniGameFallbackColor,
  miniGameFallbackIcon,
  miniGameIconMap,
} from "@/components/games/miniGameTheme";

interface MoreMiniGamesProps {
  games: MiniGame[];
}

/**
 * Compact cross-links to the other mini games, shown under the game board.
 */
export default function MoreMiniGames({ games }: MoreMiniGamesProps) {
  if (games.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Gamepad2 className="h-4 w-4 text-primary" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">More Mini Games</h2>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {games.map((other) => {
          const colors = miniGameColorMap[other.color] ?? miniGameFallbackColor;
          const Icon = miniGameIconMap[other.icon] ?? miniGameFallbackIcon;
          return (
            <li key={other.id}>
              <Link
                href={`/games/play/${other.id}`}
                className={`group flex items-center gap-3 rounded-xl border ${colors.border} ${colors.hover} bg-gradient-to-br ${colors.bg} p-3 transition-all hover:shadow-sm`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${colors.text}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {other.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {other.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
