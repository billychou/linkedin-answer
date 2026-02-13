"use client";

import { useToast } from "@/hooks/use-toast";
import { Game, GameAnswer } from "@/types/game";
import { ArrowRight, Calendar, Check, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface TodayPinpointProps {
  game: Game;
  answer: GameAnswer;
}

export default function TodayPinpoint({ game, answer }: TodayPinpointProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const textToCopy = Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer;
    
    // 检查是否支持 clipboard API
    if (!navigator.clipboard) {
      // 备用方案：使用传统的复制方法
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast({
            title: "Copied!",
            description: "Answer copied to clipboard",
          });
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error("execCommand failed");
        }
      } catch (fallbackErr) {
        toast({
          title: "Failed to copy",
          description: "Please select and copy the text manually",
          variant: "destructive",
        });
      }
      return;
    }
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Answer copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please select and copy the text manually",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100">
              Today&apos;s Pinpoint Answer
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(answer.date)}</span>
              {answer.sequence && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  · {answer.sequence}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/games/${game.slug}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/20 group"
        >
          View Details
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Answer Card */}
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900/50 p-6 sm:p-8 shadow-xl shadow-blue-900/5">
        {/* Answer Display */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Answer
            </p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              title="Copy answer"
              aria-label="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 sm:p-8 border-2 border-blue-300 dark:border-blue-700 shadow-inner">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-600 dark:text-blue-400 break-words text-center">
              {Array.isArray(answer.answer) ? answer.answer.join(", ") : answer.answer}
            </p>
          </div>
        </div>

        {/* Clues Section */}
        {answer.clues && answer.clues.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">
              Clues
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {answer.clues.map((clue, index) => (
                <div
                  key={index}
                  className="relative rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-4 text-center hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-1"
                >
                  <span className="absolute top-2 left-2 text-white/40 text-xs font-bold">
                    #{index + 1}
                  </span>
                  <p className="text-white font-semibold text-sm sm:text-base mt-3">
                    {clue}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hint Text */}
        {answer.clueHint && (
          <div className="mt-6 p-4 bg-blue-100/50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-medium text-blue-600 dark:text-blue-400">Tip:</span>{" "}
              Hover or tap each clue on the detail page to see how it connects to the answer
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      {/* <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
        <Link
          href={`/games/${game.slug}/archives`}
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
        >
          View Archives
        </Link>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Link
          href={`/games/${game.slug}/how-to-play`}
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
        >
          How to Play
        </Link>
        {game.playUrl && (
          <>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Play on LinkedIn
            </a>
          </>
        )}
      </div> */}
    </div>
  );
}
