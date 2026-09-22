"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw, Target, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Difficulty = "easy" | "medium" | "hard";
type Verdict = "low" | "high" | "hit";
type Status = "playing" | "won" | "lost";

const DIFFICULTIES: Record<Difficulty, { label: string; max: number; tries: number }> = {
  easy: { label: "Easy", max: 50, tries: 8 },
  medium: { label: "Medium", max: 100, tries: 10 },
  hard: { label: "Hard", max: 500, tries: 12 },
};

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

const BEST_KEY = "guess-the-number:best";
const WINS_KEY = "guess-the-number:wins";

/**
 * Heat levels describe how close a guess is, relative to the size of the range.
 * `max` is the distance ratio (|guess - secret| / range) the level still covers.
 */
const HEAT_LEVELS = [
  {
    max: 0.01,
    label: "Boiling!",
    emoji: "🔥",
    chip: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
  {
    max: 0.03,
    label: "Scorching",
    emoji: "🥵",
    chip: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
  },
  {
    max: 0.08,
    label: "Hot",
    emoji: "☀️",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  {
    max: 0.2,
    label: "Warm",
    emoji: "🙂",
    chip: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    bar: "bg-yellow-500",
  },
  {
    max: 0.4,
    label: "Cold",
    emoji: "❄️",
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  {
    max: Number.POSITIVE_INFINITY,
    label: "Freezing",
    emoji: "🧊",
    chip: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
  },
] as const;

function randomSecret(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

function heatFor(guess: number, secret: number, max: number) {
  const distance = Math.abs(guess - secret) / max;
  const closeness = Math.max(0, Math.min(1, 1 - distance));
  const level = HEAT_LEVELS.find((l) => distance <= l.max) ?? HEAT_LEVELS[HEAT_LEVELS.length - 1];
  return { label: level.label, emoji: level.emoji, chip: level.chip, bar: level.bar, closeness };
}

type Heat = ReturnType<typeof heatFor>;
type GuessRecord = { value: number; verdict: Verdict; heat: Heat };

/** Fewest guesses a perfect binary search needs for `1..max`. */
function optimalGuesses(max: number): number {
  return Math.ceil(Math.log2(max + 1));
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default function GuessTheNumber() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [secret, setSecret] = useState(() => randomSecret(DIFFICULTIES.medium.max));
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [best, setBest] = useState<Partial<Record<Difficulty, number>>>({});
  const [wins, setWins] = useState(0);
  const [statsReady, setStatsReady] = useState(false);
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const bestRef = useRef<Partial<Record<Difficulty, number>>>({});
  const winsRef = useRef(0);
  const skipInputFocusRef = useRef(true);

  const cfg = DIFFICULTIES[difficulty];
  const triesLeft = Math.max(0, cfg.tries - guesses.length);
  const latest = guesses.length > 0 ? guesses[guesses.length - 1] : null;
  const optimal = optimalGuesses(cfg.max);

  /** Range the secret number can still be in, derived from past guesses. */
  const bounds = useMemo(() => {
    let low = 1;
    let high = cfg.max;
    for (const g of guesses) {
      if (g.verdict === "low") low = Math.max(low, g.value + 1);
      if (g.verdict === "high") high = Math.min(high, g.value - 1);
    }
    return { low, high, size: Math.max(0, high - low + 1) };
  }, [guesses, cfg.max]);

  // Load persisted stats once, on the client, so SSR/CSR markup stays identical.
  useEffect(() => {
    try {
      const rawBest = window.localStorage.getItem(BEST_KEY);
      if (rawBest) {
        const parsed: unknown = JSON.parse(rawBest);
        if (parsed && typeof parsed === "object") {
          const clean: Partial<Record<Difficulty, number>> = {};
          for (const d of DIFFICULTY_ORDER) {
            const value = (parsed as Record<string, unknown>)[d];
            if (typeof value === "number" && Number.isFinite(value) && value > 0) {
              clean[d] = Math.floor(value);
            }
          }
          bestRef.current = clean;
          setBest(clean);
        }
      }
      const rawWins = Number(window.localStorage.getItem(WINS_KEY));
      if (Number.isFinite(rawWins) && rawWins > 0) {
        winsRef.current = Math.floor(rawWins);
        setWins(winsRef.current);
      }
    } catch {
      // Storage unavailable (private mode, SSR) — play without saved stats.
    }
    setStatsReady(true);
  }, []);

  const startRound = useCallback((nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty);
    setSecret(randomSecret(DIFFICULTIES[nextDifficulty].max));
    setGuesses([]);
    setStatus("playing");
    setInput("");
    setError(null);
  }, []);

  const recordWin = useCallback((won: Difficulty, usedTries: number): boolean => {
    const previous = bestRef.current[won];
    const isNewBest = previous === undefined || usedTries < previous;
    if (isNewBest) {
      bestRef.current = { ...bestRef.current, [won]: usedTries };
      setBest(bestRef.current);
      try {
        window.localStorage.setItem(BEST_KEY, JSON.stringify(bestRef.current));
      } catch {
        /* ignore write failures */
      }
    }
    winsRef.current += 1;
    setWins(winsRef.current);
    try {
      window.localStorage.setItem(WINS_KEY, String(winsRef.current));
    } catch {
      /* ignore write failures */
    }
    return isNewBest;
  }, []);

  const resetStats = useCallback(() => {
    bestRef.current = {};
    winsRef.current = 0;
    setBest({});
    setWins(0);
    try {
      window.localStorage.removeItem(BEST_KEY);
      window.localStorage.removeItem(WINS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const submitGuess = useCallback(() => {
    if (status !== "playing") return;

    const raw = input.trim();
    if (raw === "") {
      setError("Type a number first.");
      return;
    }
    const value = Number(raw);
    if (!Number.isInteger(value)) {
      setError("Whole numbers only — no decimals.");
      return;
    }
    if (value < 1 || value > cfg.max) {
      setError(`Stay inside the range 1–${cfg.max}.`);
      return;
    }
    if (guesses.some((g) => g.value === value)) {
      setError(`You already tried ${value}.`);
      return;
    }

    setError(null);
    const verdict: Verdict = value === secret ? "hit" : value < secret ? "low" : "high";
    const record: GuessRecord = { value, verdict, heat: heatFor(value, secret, cfg.max) };
    const nextGuesses = [...guesses, record];
    setGuesses(nextGuesses);
    setInput("");

    if (verdict === "hit") {
      setStatus("won");
      const isNewBest = recordWin(difficulty, nextGuesses.length);
      toast({
        title: isNewBest ? "New best score!" : "You found it!",
        description: `${value} in ${plural(nextGuesses.length, "guess")} — ${record.heat.emoji} ${record.heat.label}`,
      });
      return;
    }

    if (nextGuesses.length >= cfg.tries) {
      setStatus("lost");
      toast({
        title: "Out of tries!",
        description: `The secret number was ${secret}.`,
        variant: "destructive",
      });
    }
  }, [cfg.max, cfg.tries, difficulty, guesses, input, recordWin, secret, status, toast]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitGuess();
    },
    [submitGuess]
  );

  // Move focus to the input whenever a fresh round starts (skipped on first mount
  // so loading the page never yanks focus or scrolls).
  useEffect(() => {
    if (status !== "playing") return;
    if (skipInputFocusRef.current) {
      skipInputFocusRef.current = false;
      return;
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [difficulty, status]);

  // When the round ends, focus the replay button so keyboard players can restart.
  useEffect(() => {
    if (status === "playing") return;
    replayRef.current?.focus({ preventScroll: true });
  }, [status]);

  const usedRatio = guesses.length / cfg.tries;
  const barColor =
    triesLeft <= 1
      ? "from-red-500 to-red-600"
      : triesLeft <= Math.ceil(cfg.tries / 3)
        ? "from-amber-400 to-amber-500"
        : "from-emerald-400 to-emerald-500";
  const isPlaying = status === "playing";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {/* Difficulty picker */}
      <div
        role="group"
        aria-label="Difficulty"
        className="grid w-full max-w-md grid-cols-3 gap-2"
      >
        {DIFFICULTY_ORDER.map((level) => {
          const option = DIFFICULTIES[level];
          const active = level === difficulty;
          return (
            <button
              key={level}
              type="button"
              onClick={() => startRound(level)}
              aria-pressed={active}
              className={`rounded-xl border px-2 py-2 text-center transition-all active:scale-95 ${
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground"
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                1–{option.max} · {option.tries} tries
              </span>
            </button>
          );
        })}
      </div>

      {/* Tries tracker */}
      <div className="w-full max-w-md">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            Tries left
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {triesLeft} / {cfg.tries}
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Tries used"
          aria-valuemin={0}
          aria-valuemax={cfg.tries}
          aria-valuenow={guesses.length}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, usedRatio * 100)}%` }}
          />
        </div>
      </div>

      {/* Live clue panel */}
      <div
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-border bg-muted/30 p-4 text-center"
      >
        {latest && latest.verdict !== "hit" ? (
          <>
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
              {latest.verdict === "low" ? (
                <>
                  <ArrowUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  {latest.value} is too low — go higher
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  {latest.value} is too high — go lower
                </>
              )}
            </p>
            <p
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${latest.heat.chip}`}
            >
              <span aria-hidden="true">{latest.heat.emoji}</span>
              {latest.heat.label}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className={`h-full rounded-full transition-all duration-300 ${latest.heat.bar}`}
                style={{ width: `${Math.round(latest.heat.closeness * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            I&apos;m thinking of a number between{" "}
            <span className="font-semibold text-foreground">1 and {cfg.max}</span>. You have{" "}
            <span className="font-semibold text-foreground">{cfg.tries} tries</span> — hunt it down!
          </p>
        )}
      </div>

      {/* Guess input */}
      <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={cfg.max}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          disabled={!isPlaying}
          placeholder={`1 – ${cfg.max}`}
          aria-label="Your guess"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "guess-error" : undefined}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isPlaying}
          className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-base font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guess
        </button>
      </form>

      {error ? (
        <p id="guess-error" role="alert" className="-mt-1 text-sm font-medium text-red-500">
          {error}
        </p>
      ) : null}

      {/* Narrowed-range hint */}
      {isPlaying && guesses.length > 0 ? (
        <p className="-mt-1 text-xs text-muted-foreground">
          Narrowed to{" "}
          <span className="font-semibold text-foreground">
            {bounds.low}–{bounds.high}
          </span>{" "}
          · {plural(bounds.size, "number")} left · midpoint is{" "}
          <span className="font-semibold text-foreground">
            {Math.floor((bounds.low + bounds.high) / 2)}
          </span>
        </p>
      ) : null}

      {/* Round result */}
      {!isPlaying ? (
        <div
          className={`w-full max-w-md rounded-2xl border p-4 text-center ${
            status === "won"
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          {status === "won" ? (
            <>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                🎉 You found {secret} in {plural(guesses.length, "guess")}!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {guesses.length <= optimal
                  ? "Flawless — that matches a perfect binary search for this range."
                  : `A perfect binary search needs ${plural(optimal, "guess")} here. Try to match it!`}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                Out of tries — the secret number was {secret}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Halve the remaining range each time and you&apos;ll always land within {optimal}{" "}
                guesses.
              </p>
            </>
          )}
          <button
            ref={replayRef}
            type="button"
            onClick={() => startRound(difficulty)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play again
          </button>
        </div>
      ) : null}

      {/* Guess history */}
      {guesses.length > 0 ? (
        <div className="w-full max-w-md">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your guesses
          </h3>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {[...guesses]
              .map((g, index) => ({ ...g, attempt: index + 1 }))
              .reverse()
              .map((g) => (
                <li
                  key={g.attempt}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
                    #{g.attempt}
                  </span>
                  <span className="w-10 shrink-0 text-base font-bold text-foreground tabular-nums">
                    {g.value}
                  </span>
                  {g.verdict === "hit" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Target className="h-3.5 w-3.5" aria-hidden="true" />
                      Bullseye
                    </span>
                  ) : g.verdict === "low" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ArrowUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      Too low
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <ArrowDown className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                      Too high
                    </span>
                  )}
                  <span
                    className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${g.heat.chip}`}
                  >
                    <span aria-hidden="true">{g.heat.emoji}</span> {g.heat.label}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {/* Stats */}
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
          Best ({cfg.label}):{" "}
          <span className="font-semibold text-foreground">
            {statsReady ? (best[difficulty] !== undefined ? `${best[difficulty]} guesses` : "—") : "—"}
          </span>
        </span>
        <span>
          Wins: <span className="font-semibold text-foreground">{statsReady ? wins : "—"}</span>
        </span>
        <span>
          Optimal: <span className="font-semibold text-foreground">{optimal}</span>
        </span>
        {statsReady ? (
          <button
            type="button"
            onClick={resetStats}
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Reset stats
          </button>
        ) : null}
      </div>
    </div>
  );
}
