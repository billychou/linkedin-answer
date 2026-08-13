"use client";

import { useToast } from "@/hooks/use-toast";
import { Game, GameAnswer } from "@/types/game";
import { ArrowRight, Check, Copy, Crosshair, Twitter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface HeroPinpointCardProps {
  game: Game;
  answer: GameAnswer;
}

export default function HeroPinpointCard({ game, answer }: HeroPinpointCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const answerText = Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer;
  const clues = (answer.clues ?? []).slice(0, 4);
  const asTiles = !Array.isArray(answer.answer) && answer.answer.length <= 12 && !answer.answer.includes(" ");

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answerText);
      setCopied(true);
      toast({ title: "Copied!", description: "Answer copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", description: "Please copy the text manually", variant: "destructive" });
    }
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Today's LinkedIn ${game.name} answer: ${answerText}`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="relative">
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20 blur-xl" aria-hidden />
      <div className="relative rounded-2xl border border-border bg-card p-5 shadow-lift">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Crosshair className="h-5 w-5" />
            </span>
            <div>
              <div className="font-display font-bold leading-tight">Today&apos;s Pinpoint</div>
              <div className="text-xs text-muted-foreground">
                {new Date(answer.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
          {answer.sequence && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {answer.sequence}
            </span>
          )}
        </div>

        {/* clues */}
        <div className="mt-4 grid gap-2">
          {clues.map((clue, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-muted/70 px-4 py-2.5 animate-stagger-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span className="font-display font-bold text-primary">{i + 1}</span>
              <span className="text-sm font-medium">{clue}</span>
            </div>
          ))}
        </div>

        {/* reveal */}
        <div className="mt-4">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-card transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Reveal answer
            </button>
          ) : (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Today&apos;s answer
              </div>
              {asTiles ? (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {answerText.split("").map((ch, i) => (
                    <span
                      key={i}
                      className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground animate-stagger-fade-in"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 font-display text-2xl font-extrabold text-primary">{answerText}</div>
              )}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={copyAnswer}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={shareTwitter}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted"
                  aria-label="Share on X"
                >
                  <Twitter className="h-3.5 w-3.5" /> Post
                </button>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <Link
          href={`/games/${game.slug}`}
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80"
        >
          Full answer, clues &amp; archives <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
