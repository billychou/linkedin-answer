"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["red", "green", "blue", "yellow"] as const;
type Color = (typeof COLORS)[number];

const colorStyles: Record<Color, { base: string; active: string; glow: string }> = {
  red: {
    base: "bg-red-500 dark:bg-red-600",
    active: "bg-red-300 dark:bg-red-400 scale-95",
    glow: "shadow-red-500/50",
  },
  green: {
    base: "bg-green-500 dark:bg-green-600",
    active: "bg-green-300 dark:bg-green-400 scale-95",
    glow: "shadow-green-500/50",
  },
  blue: {
    base: "bg-blue-500 dark:bg-blue-600",
    active: "bg-blue-300 dark:bg-blue-400 scale-95",
    glow: "shadow-blue-500/50",
  },
  yellow: {
    base: "bg-yellow-500 dark:bg-yellow-600",
    active: "bg-yellow-300 dark:bg-yellow-400 scale-95",
    glow: "shadow-yellow-500/50",
  },
};

export default function SimonSays() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [level, setLevel] = useState(0);
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const flashColor = useCallback(
    (color: Color, delay: number) => {
      return new Promise<void>((resolve) => {
        const t1 = setTimeout(() => {
          setActiveColor(color);
          const t2 = setTimeout(() => {
            setActiveColor(null);
            resolve();
          }, 400);
          timeoutsRef.current.push(t2);
        }, delay);
        timeoutsRef.current.push(t1);
      });
    },
    []
  );

  const playSequence = useCallback(
    async (seq: Color[]) => {
      setIsPlaying(true);
      for (let i = 0; i < seq.length; i++) {
        await flashColor(seq[i], i * 600);
      }
      setIsPlaying(false);
      setIsActive(true);
    },
    [flashColor]
  );

  const startGame = useCallback(() => {
    clearAllTimeouts();
    setActiveColor(null);
    setIsActive(false);
    setIsPlaying(false);
    setPlayerIndex(0);
    setLevel(0);
    const firstColor = COLORS[Math.floor(Math.random() * 4)];
    const newSeq = [firstColor];
    setSequence(newSeq);
    setLevel(1);
    timeoutRef.current = setTimeout(() => playSequence(newSeq), 500);
  }, [clearAllTimeouts, playSequence]);

  const handleClick = useCallback(
    (color: Color) => {
      if (!isActive || isPlaying) return;

      setActiveColor(color);
      setTimeout(() => setActiveColor(null), 200);

      if (sequence[playerIndex] === color) {
        const nextIndex = playerIndex + 1;
        if (nextIndex === sequence.length) {
          // Completed the sequence
          setIsActive(false);
          setPlayerIndex(0);
          const nextLevel = level + 1;
          setLevel(nextLevel);
          const newSeq = [...sequence, COLORS[Math.floor(Math.random() * 4)]];
          setSequence(newSeq);
          timeoutRef.current = setTimeout(() => playSequence(newSeq), 800);
        } else {
          setPlayerIndex(nextIndex);
        }
      } else {
        // Wrong!
        setIsActive(false);
        toast({
          title: "Wrong!",
          description: `You reached level ${level}.`,
          variant: "destructive",
        });
        setSequence([]);
        setLevel(0);
        setPlayerIndex(0);
      }
    },
    [isActive, isPlaying, sequence, playerIndex, level, toast, playSequence]
  );

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground w-full max-w-sm">
        <p className="font-medium text-foreground mb-1">How to Play</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Watch the color sequence carefully</li>
          <li>Tap the colored buttons to repeat it in order</li>
          <li>Each round adds one more color — how far can you go?</li>
        </ul>
      </div>
      {level > 0 && (
        <div className="mb-4 text-sm">
          <span className="text-muted-foreground">Level: </span>
          <span className="font-semibold">{level}</span>
        </div>
      )}
      {!isActive && sequence.length === 0 && (
        <button
          onClick={startGame}
          className="mb-6 px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold text-lg hover:from-teal-600 hover:to-teal-700 transition-all active:scale-95"
        >
          Start Game
        </button>
      )}
      {isPlaying && (
        <p className="mb-4 text-sm text-muted-foreground animate-pulse">Watch the sequence...</p>
      )}
      {isActive && (
        <p className="mb-4 text-sm text-muted-foreground">Your turn! Repeat the sequence.</p>
      )}

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleClick(color)}
            disabled={!isActive || isPlaying}
            className={`aspect-square rounded-2xl transition-all duration-200 ${
              activeColor === color
                ? `${colorStyles[color].active} shadow-lg ${colorStyles[color].glow}`
                : `${colorStyles[color].base} hover:opacity-80 active:scale-95`
            } ${!isActive || isPlaying ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            aria-label={color}
          />
        ))}
      </div>
    </div>
  );
}
