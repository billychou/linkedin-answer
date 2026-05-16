"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

type Grid = number[][];

const SIZE = 4;

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(grid: Grid): Grid {
  const g = grid.map((r) => [...r]);
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (g[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return g;
}

function initGrid(): Grid {
  return addRandom(addRandom(emptyGrid()));
}

function slideRow(row: number[]): { row: number[]; score: number } {
  let score = 0;
  let arr = row.filter((v) => v !== 0);
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < SIZE) arr.push(0);
  return { row: arr, score };
}

function move(grid: Grid, dir: "up" | "down" | "left" | "right"): { grid: Grid; score: number } {
  let totalScore = 0;
  const g = grid.map((r) => [...r]);

  const processLine = (line: number[]) => {
    const result = slideRow(line);
    totalScore += result.score;
    return result.row;
  };

  if (dir === "left") {
    for (let r = 0; r < SIZE; r++) g[r] = processLine(g[r]);
  } else if (dir === "right") {
    for (let r = 0; r < SIZE; r++) g[r] = processLine([...g[r]].reverse()).reverse();
  } else if (dir === "up") {
    for (let c = 0; c < SIZE; c++) {
      const col = g.map((r) => r[c]);
      const newCol = processLine(col);
      for (let r = 0; r < SIZE; r++) g[r][c] = newCol[r];
    }
  } else if (dir === "down") {
    for (let c = 0; c < SIZE; c++) {
      const col = g.map((r) => r[c]).reverse();
      const newCol = processLine(col).reverse();
      for (let r = 0; r < SIZE; r++) g[r][c] = newCol[r];
    }
  }

  return { grid: g, score: totalScore };
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

function canMove(grid: Grid): boolean {
  for (const dir of ["up", "down", "left", "right"] as const) {
    const { grid: newGrid } = move(grid, dir);
    if (!gridsEqual(grid, newGrid)) return true;
  }
  return false;
}

const tileColors: Record<number, string> = {
  0: "bg-gray-200 dark:bg-gray-700",
  2: "bg-amber-100 dark:bg-amber-900/40 text-gray-800 dark:text-amber-100",
  4: "bg-amber-200 dark:bg-amber-800/50 text-gray-800 dark:text-amber-100",
  8: "bg-orange-300 dark:bg-orange-700 text-white",
  16: "bg-orange-400 dark:bg-orange-600 text-white",
  32: "bg-orange-500 dark:bg-orange-500 text-white",
  64: "bg-red-500 dark:bg-red-500 text-white",
  128: "bg-yellow-300 dark:bg-yellow-600 text-gray-800 dark:text-yellow-100",
  256: "bg-yellow-400 dark:bg-yellow-500 text-gray-800 dark:text-yellow-100",
  512: "bg-yellow-500 dark:bg-yellow-400 text-white",
  1024: "bg-green-400 dark:bg-green-500 text-white",
  2048: "bg-green-500 dark:bg-green-400 text-white font-bold",
};

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const { toast } = useToast();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const doMove = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      if (gameOver || won) return;
      const { grid: newGrid, score: gained } = move(grid, dir);
      if (gridsEqual(grid, newGrid)) return;
      const withNew = addRandom(newGrid);
      setGrid(withNew);
      setScore((s) => s + gained);
      if (withNew.flat().includes(2048)) {
        setWon(true);
        toast({ title: "You reached 2048!", description: `Score: ${score + gained}` });
      } else if (!canMove(withNew)) {
        setGameOver(true);
        toast({ title: "Game Over", description: `Final score: ${score + gained}` });
      }
    },
    [grid, score, gameOver, won, toast]
  );

  const reset = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (map[e.key]) {
        e.preventDefault();
        doMove(map[e.key]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [doMove]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 30) return;
    if (absDx > absDy) {
      doMove(dx > 0 ? "right" : "left");
    } else {
      doMove(dy > 0 ? "down" : "up");
    }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground w-full max-w-sm">
        <p className="font-medium text-foreground mb-1">How to Play</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Swipe or use arrow keys to slide tiles</li>
          <li>Matching numbers merge together (2+2=4, 4+4=8...)</li>
          <li>Reach the 2048 tile to win!</li>
        </ul>
      </div>
      <div className="flex items-center gap-6 mb-4 text-sm">
        <span><span className="text-muted-foreground">Score: </span><span className="font-semibold">{score}</span></span>
      </div>
      <div
        ref={boardRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="grid grid-cols-4 gap-2 p-2 rounded-xl bg-gray-300 dark:bg-gray-600 w-full max-w-sm aspect-square select-none"
        style={{ touchAction: "none" }}
      >
        {grid.flat().map((val, i) => (
          <div
            key={i}
            className={`rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold transition-all duration-150 ${
              tileColors[val] || "bg-purple-500 dark:bg-purple-400 text-white"
            }`}
          >
            {val !== 0 ? val : ""}
          </div>
        ))}
      </div>
      {gameOver && (
        <p className="mt-4 text-lg font-semibold text-red-500">Game Over!</p>
      )}
      {won && !gameOver && (
        <p className="mt-4 text-lg font-semibold text-green-500">You reached 2048! Keep going?</p>
      )}
    </div>
  );
}
