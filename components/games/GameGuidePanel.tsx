import { HelpCircle, Lightbulb } from "lucide-react";
import type { MiniGame } from "@/data/miniGames";

interface GameGuidePanelProps {
  game: MiniGame;
}

/**
 * Right-hand column of the mini game detail page: How to Play + Pro Tips.
 */
export default function GameGuidePanel({ game }: GameGuidePanelProps) {
  const hasTips = Boolean(game.tips && game.tips.length > 0);

  return (
    <aside className="space-y-5 sm:space-y-6">
      {/* How to Play */}
      <section
        id="how-to-play"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-4 w-4 text-primary" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">How to Play</h2>
        </div>
        <ol className="mt-4 space-y-3">
          {game.howToPlay.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Pro Tips */}
      {hasTips && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Lightbulb className="h-4 w-4 text-warning" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">Pro Tips</h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {game.tips!.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
