"use client";

import { Gamepad2, RotateCcw } from "lucide-react";
import { useState } from "react";

interface GamePlayShellProps {
  children: React.ReactNode;
}

export default function GamePlayShell({ children }: GamePlayShellProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Gamepad2 className="h-4 w-4 text-primary" />
          </span>
          Game Board
        </h2>
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          New Game
        </button>
      </div>
      <div key={resetKey}>{children}</div>
    </div>
  );
}
