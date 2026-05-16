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
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          New Game
        </button>
      </div>
      <div key={resetKey}>{children}</div>
    </div>
  );
}
