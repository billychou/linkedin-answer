"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";

interface AnswerRevealProps {
  answer: string | string[];
  gameName: string;
}

export default function AnswerReveal({ answer, gameName }: AnswerRevealProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("Games");
  const isArray = Array.isArray(answer);

  const handleCopy = async () => {
    const textToCopy = isArray ? answer.join(", ") : answer;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: t("copied") || "Copied!",
        description: t("copiedDescription") || "Answer copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t("copyFailed") || "Failed to copy",
        description: t("copyFailedDescription") || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-xl border-4 border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 p-6 sm:p-8 shadow-xl">
      <div className="mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-gray-100 mb-2">
          {gameName} Answer:
        </h3>
      </div>

      <div className="space-y-4">
        {isArray ? (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {answer.map((item, index) => (
              <span
                key={index}
                className="inline-block px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-xl font-bold text-xl sm:text-2xl shadow-lg transform hover:scale-105 transition-transform duration-200"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 sm:p-8 border-2 border-blue-300 dark:border-blue-600 relative">
            <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-blue-600 dark:text-blue-400 break-words text-center pr-14">
              {answer}
            </p>
            {/* 复制按钮 - 右上角 */}
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200 group hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
              title={t("copyAnswer") || "Copy answer"}
              aria-label={t("copyAnswer") || "Copy answer"}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
