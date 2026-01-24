"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface AnswerRevealProps {
  answer: string | string[];
  gameName: string;
}

export default function AnswerReveal({ answer, gameName }: AnswerRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const t = useTranslations("Games");
  const isArray = Array.isArray(answer);

  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 sm:p-8">
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-gray-100 mb-2">
          {gameName} Answer:
        </h3>
      </div>

      {!isRevealed ? (
        <button
          onClick={() => setIsRevealed(true)}
          className="w-full py-5 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-base sm:text-lg">{t("clickToReveal") || "Click to reveal the answer"}</span>
        </button>
      ) : (
        <div className="space-y-4 animate-[fadeIn_0.6s_ease-in-out]">
          {isArray ? (
            <div className="flex flex-wrap gap-3">
              {answer.map((item, index) => (
                <span
                  key={index}
                  className="inline-block px-5 py-3 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-900 dark:text-blue-100 rounded-lg font-bold text-lg sm:text-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  style={{ 
                    animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-gray-100 break-words text-center py-4">
              {answer}
            </p>
          )}
          <button
            onClick={() => setIsRevealed(false)}
            className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-2 transition-colors duration-200"
          >
            <EyeOff className="w-4 h-4" />
            <span>{t("hideAnswer") || "Hide answer"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
