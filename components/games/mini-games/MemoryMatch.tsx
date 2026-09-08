"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const emojis = ["🎯", "🎨", "🎭", "🎪", "🎸", "🎺", "🎻", "🎹", "🎲", "🎳", "🎮", "🎰"];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle(array: Card[]): Card[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createCards(): Card[] {
  const pairs = emojis.slice(0, 6);
  const cards = pairs.flatMap((emoji, i) => [
    { id: i * 2, emoji, isFlipped: false, isMatched: false },
    { id: i * 2 + 1, emoji, isFlipped: false, isMatched: false },
  ]);
  return shuffle(cards);
}

export default function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>(createCards);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  const handleFlip = useCallback(
    (id: number) => {
      if (isLocked) return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.isFlipped || card.isMatched) return;
      if (flippedIds.includes(id)) return;

      const newFlipped = [...flippedIds, id];
      setFlippedIds(newFlipped);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)));

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        setIsLocked(true);
        const [first, second] = newFlipped;
        const card1 = cards.find((c) => c.id === first)!;
        const card2 = cards.find((c) => c.id === second)!;

        if (card1.emoji === card2.emoji) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isMatched: true, isFlipped: true } : c
            )
          );
          setMatchedPairs((p) => p + 1);
          setFlippedIds([]);
          setIsLocked(false);
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === first || c.id === second ? { ...c, isFlipped: false } : c
              )
            );
            setFlippedIds([]);
            setIsLocked(false);
          }, 800);
        }
      }
    },
    [cards, flippedIds, isLocked]
  );

  const reset = useCallback(() => {
    setCards(createCards());
    setFlippedIds([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsLocked(false);
  }, []);

  useEffect(() => {
    if (matchedPairs === 6) {
      toast({
        title: "You won!",
        description: `Completed in ${moves} moves.`,
      });
    }
  }, [matchedPairs, moves, toast]);

  const gridCols = "grid-cols-4";

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-6 mb-4 text-sm">
        <span><span className="text-muted-foreground">Pairs: </span><span className="font-semibold">{matchedPairs}/6</span></span>
        <span><span className="text-muted-foreground">Moves: </span><span className="font-semibold">{moves}</span></span>
      </div>
      <div className={`grid ${gridCols} gap-3 w-full max-w-sm`}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            disabled={card.isMatched || card.isFlipped}
            className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 transform ${
              card.isFlipped || card.isMatched
                ? card.isMatched
                  ? "bg-green-500/20 border-2 border-green-500/40 scale-95"
                  : "bg-card dark:bg-gray-800 border-2 border-purple-500/40 scale-100"
                : "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-2 border-purple-500/20 hover:scale-105 active:scale-95 cursor-pointer"
            }`}
            aria-label={card.isFlipped || card.isMatched ? card.emoji : "Hidden card"}
          >
            {card.isFlipped || card.isMatched ? (
              <span>{card.emoji}</span>
            ) : (
              <span className="text-white text-xl font-bold">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
