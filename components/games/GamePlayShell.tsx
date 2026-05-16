"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

interface GamePlayShellProps {
  children: React.ReactNode;
}

export default function GamePlayShell({ children }: GamePlayShellProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Game Board</h2>
        <button
          onClick={() => setResetKey((k) => k + 1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          New Game
        </button>
      </div>
      <div key={resetKey}>{children}</div>
    </div>
  );
}
