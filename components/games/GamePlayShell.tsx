"use client";

import { MiniGame } from "@/data/miniGames";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState } from "react";

interface GamePlayShellProps {
  game: MiniGame;
  children: React.ReactNode;
}

export default function GamePlayShell({ game, children }: GamePlayShellProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/games"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Games
        </Link>
        <button
          onClick={() => setResetKey((k) => k + 1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          New Game
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">{game.name}</h1>

      <div key={resetKey}>{children}</div>
    </div>
  );
}
