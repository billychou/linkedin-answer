"use client";

import { Lightbulb } from "lucide-react";

interface CluesDisplayProps {
  clues: string[];
  gameName: string;
}

export default function CluesDisplay({ clues, gameName }: CluesDisplayProps) {
  if (!clues || clues.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-gray-100">
          {gameName} Clues:
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {clues.map((clue, index) => (
          <div
            key={index}
            className="relative rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-md transform hover:scale-[1.02]"
            style={{ 
              animation: `fadeIn 0.5s ease-in-out ${index * 0.1}s both`
            }}
          >
            <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-md">
              #{index + 1}
            </div>
            <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-gray-100 pt-2">
              {clue}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
