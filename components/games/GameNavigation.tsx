"use client";

import { Game } from "@/types/game";
import Link from "next/link";
import { ExternalLink, Archive, BookOpen, Home } from "lucide-react";

interface GameNavigationProps {
  game: Game;
  currentPage?: "answer" | "archives" | "how-to-play";
}

export default function GameNavigation({
  game,
  currentPage = "answer",
}: GameNavigationProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8 pb-4 border-b border-border text-sm sm:text-base">
      <Link
        href="/"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Home</span>
      </Link>

      <span className="text-border">/</span>

      <a
        href={`/games/${game.slug}`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "answer"
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Today&apos;s Answer
      </a>

      <span className="text-border">/</span>

      <a
        href={`/games/${game.slug}/archives`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "archives"
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Archive className="w-4 h-4" />
        <span>Archives</span>
      </a>

      <span className="text-border">/</span>

      <a
        href={`/games/${game.slug}/how-to-play`}
        className={`flex items-center gap-2 transition-colors ${
          currentPage === "how-to-play"
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>How to Play</span>
      </a>

      {game.playUrl && (
        <>
          <span className="text-border">/</span>
          <a
            href={game.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Play</span>
          </a>
        </>
      )}
    </nav>
  );
}
