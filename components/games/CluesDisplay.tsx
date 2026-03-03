"use client";

import { Info } from "lucide-react";

interface CluesDisplayProps {
  clues: string[];
  gameName: string;
  number?: number; // Pinpoint 编号，如 635
  clueHint?: string; // 可配置的提示文字
}

export default function CluesDisplay({ clues, gameName, number, clueHint }: CluesDisplayProps) {
  if (!clues || clues.length === 0) {
    return null;
  }

  // 优先使用传入的 clueHint，如果没有则使用默认英文
  const displayHint = clueHint || "Hover (desktop) or tap (mobile) each clue to see how it connects to the answer";
  
  // 检查是否包含 HTML 标签
  const containsHTML = /<[^>]+>/.test(displayHint);
  
  // 处理 HTML：将 <string> 替换为 <strong>，并清理多余的包装标签
  const processedHint = containsHTML
    ? displayHint
        .replace(/<string>/g, "<strong>")
        .replace(/<\/string>/g, "</strong>")
        .replace(/^<div><p>/, "")
        .replace(/<\/p><\/div>$/, "")
    : displayHint;

  return (
    <div className="mb-6">
      {/* 标题 */}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-gray-100 mb-3">
        {gameName} {number ? `#${number} ` : ""}Clues:
      </h2>
      {/* 线索框 - 水平排列 */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {clues.map((clue, index) => (
          <div
            key={index}
            className="relative rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 p-3 sm:p-4 flex-1 hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-default"
            style={{ 
              animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`
            }}
          >
            {/* 编号 */}
            <div className="text-white/90 text-xs font-semibold mb-1.5">
              #{index + 1}
            </div>
            {/* 线索文字 */}
            <p className="text-white text-sm sm:text-base font-semibold leading-tight break-words">
              {clue}
            </p>
          </div>
        ))}
      </div>
      {/* 提示文字 */}
      <div className="flex items-start gap-2 mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
        {containsHTML ? (
          <div 
            className="leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_strong]:font-semibold [&_strong]:text-slate-700 dark:[&_strong]:text-slate-200"
            dangerouslySetInnerHTML={{ __html: processedHint }}
          />
        ) : (
          <span className="leading-relaxed">{displayHint}</span>
        )}
      </div>
    </div>
  );
}
