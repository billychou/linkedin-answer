"use client";

import { Game } from "@/types/game";
import { ExternalLink, Play } from "lucide-react";

interface GameCardProps {
  game: Game;
}

const colorClasses: Record<string, string> = {
  blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600",
  purple: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600",
  green: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600",
  orange: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600",
  pink: "bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600",
  yellow: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600",
  indigo: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600",
  gray: "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600",
  red: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600",
  teal: "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-600",
};

const textColorClasses: Record<string, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  purple: "text-purple-600 dark:text-purple-400",
  green: "text-green-600 dark:text-green-400",
  orange: "text-orange-600 dark:text-orange-400",
  pink: "text-pink-600 dark:text-pink-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  gray: "text-gray-600 dark:text-gray-400",
  red: "text-red-600 dark:text-red-400",
  teal: "text-teal-600 dark:text-teal-400",
};

export default function GameCard({ game }: GameCardProps) {
  const colorClass = colorClasses[game.color || "blue"];
  const textColorClass = textColorClasses[game.color || "blue"];

  return (
    <div
      className={`group relative rounded-xl border-2 p-4 sm:p-6 transition-all duration-300 hover:shadow-lg ${colorClass}`}
    >
      <div className="mb-4">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-gray-100 mb-2">
          {game.name}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
          {game.description}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={`/games/${game.slug}`}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-white dark:bg-slate-800 ${textColorClass} border-2 border-current hover:bg-opacity-10 dark:hover:bg-opacity-20`}
        >
          <Play className="w-4 h-4" />
          Today's Answer
        </a>

        <div className="flex flex-wrap gap-2 text-sm">
          {game.playUrl && (
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 ${textColorClass} hover:underline`}
            >
              Play
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <a
            href={`/games/${game.slug}/archives`}
            className={`${textColorClass} hover:underline`}
          >
            Archives
          </a>
          <a
            href={`/games/${game.slug}/how-to-play`}
            className={`${textColorClass} hover:underline`}
          >
            How to Play
          </a>
        </div>
      </div>
    </div>
  );
}
