import { Game } from "@/types/game";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ExternalLink, Archive, BookOpen, Home } from "lucide-react";

interface GameNavigationProps {
  game: Game;
  currentPage?: "answer" | "archives" | "how-to-play";
}

export default function GameNavigation({
  game,
  currentPage = "answer",
}: GameNavigationProps) {
  const t = useTranslations("Games");

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200 dark:border-slate-700 text-sm sm:text-base">
      <Link
        href="/"
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>{t("home")}</span>
      </Link>

      <span className="text-slate-300 dark:text-slate-600">/</span>

      <Link
        href={`/games/${game.slug}`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "answer"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-100"
        }`}
      >
        {t("todaysAnswer")}
      </Link>

      <span className="text-slate-300 dark:text-slate-600">/</span>

      <Link
        href={`/games/${game.slug}/archives`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "archives"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-100"
        }`}
      >
        <Archive className="w-4 h-4" />
        <span>{t("archives")}</span>
      </Link>

      <span className="text-slate-300 dark:text-slate-600">/</span>

      <Link
        href={`/games/${game.slug}/how-to-play`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "how-to-play"
            ? "text-blue-600 dark:text-blue-400 font-semibold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-100"
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>{t("howToPlay")}</span>
      </Link>

      {game.playUrl && (
        <>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <a
            href={game.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-gray-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t("play")}</span>
          </a>
        </>
      )}
    </nav>
  );
}
