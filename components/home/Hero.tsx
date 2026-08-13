import { getAllAnswers } from "@/lib/answers";
import { getAllGames } from "@/lib/games";
import { Game, GameAnswer } from "@/types/game";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import HeroPinpointCard from "./HeroPinpointCard";

interface HeroProps {
  game?: Game;
  answer?: GameAnswer;
}

export default function Hero({ game, answer }: HeroProps) {
  const games = getAllGames();
  const archiveDays = getAllAnswers("pinpoint").length;

  return (
    <section className="bg-hero-glow">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-14">
        {/* Left: copy */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Updated daily ·{" "}
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>

          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Today&apos;s LinkedIn Games,{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent dark:from-primary dark:to-violet-400">
              solved &amp; explained.
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
            Answers and step-by-step clues for Pinpoint, Crossclimb, Zip, Tango,
            Queens and Patches — free, every day.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/games"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lift transition hover:bg-primary/90"
            >
              Browse all games <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/games/pinpoint/how-to-play"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" /> How to play
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
            <span>
              <b className="font-display text-foreground">{games.length}</b> games tracked
            </span>
            <span className="h-3 w-px bg-border" />
            <span>
              <b className="font-display text-foreground">{archiveDays}+</b> days of archives
            </span>
            <span className="h-3 w-px bg-border" />
            <span>
              <b className="font-display text-foreground">3</b> languages
            </span>
          </div>
        </div>

        {/* Right: live preview card */}
        {game && answer && <HeroPinpointCard game={game} answer={answer} />}
      </div>
    </section>
  );
}
