"use client";

import { useToast } from "@/hooks/use-toast";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface AnswerRevealProps {
  answer: string | string[];
  gameName: string;
  sequence?: string;
  formattedDate?: string;
}

export default function AnswerReveal({ answer, gameName, sequence, formattedDate }: AnswerRevealProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const isArray = Array.isArray(answer);
  const answerText = isArray ? answer.join(", ") : answer;
  const asTiles = !isArray && answerText.length <= 14 && !answerText.includes(" ");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answerText);
      setCopied(true);
      toast({ title: "Copied!", description: "Answer copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", description: "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Today&apos;s answer
          </div>
          <h3 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
            {gameName}
            {sequence ? ` ${sequence}` : ""}
            {formattedDate && (
              <span className="ml-2 text-sm font-medium text-muted-foreground sm:text-base">
                ({formattedDate})
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={handleCopy}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card shadow-card transition hover:bg-muted active:scale-95"
          title="Copy answer"
          aria-label="Copy answer"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="mt-5">
        {isArray ? (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {answer.map((item, index) => (
              <span
                key={index}
                className="animate-stagger-fade-in rounded-xl bg-primary px-5 py-3 font-display text-lg font-bold text-primary-foreground shadow-card sm:text-xl"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : asTiles ? (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {answerText.split("").map((ch, i) => (
              <span
                key={i}
                className="grid h-11 w-11 place-items-center rounded-lg bg-primary font-display text-xl font-bold text-primary-foreground animate-stagger-fade-in sm:h-12 sm:w-12 sm:text-2xl"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {ch}
              </span>
            ))}
          </div>
        ) : (
          <p className="break-words font-display text-3xl font-extrabold text-primary sm:text-4xl lg:text-5xl">
            {answerText}
          </p>
        )}
      </div>
    </div>
  );
}
