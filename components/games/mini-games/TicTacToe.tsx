"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isBoardFull(board: Board): boolean {
  return board.every((c) => c !== null);
}

function minimax(board: Board, isMaximizing: boolean): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "X";
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board: Board): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("Your turn (X)");
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const { toast } = useToast();

  const playerMove = useCallback(
    (index: number) => {
      if (board[index] || gameOver) return;

      const newBoard = [...board];
      newBoard[index] = "X";

      const { winner, line } = checkWinner(newBoard);
      if (winner) {
        setBoard(newBoard);
        setGameOver(true);
        setWinLine(line);
        setStatus("You win!");
        toast({ title: "You win!" });
        return;
      }
      if (isBoardFull(newBoard)) {
        setBoard(newBoard);
        setGameOver(true);
        setStatus("It's a draw!");
        toast({ title: "It's a draw!" });
        return;
      }

      setBoard(newBoard);
      setStatus("Computer is thinking...");

      // Computer move
      setTimeout(() => {
        const aiBoard = [...newBoard];
        const aiMove = getBestMove(aiBoard);
        if (aiMove === -1) return;
        aiBoard[aiMove] = "O";

        const { winner: aiWinner, line: aiLine } = checkWinner(aiBoard);
        if (aiWinner) {
          setBoard(aiBoard);
          setGameOver(true);
          setWinLine(aiLine);
          setStatus("Computer wins!");
          toast({ title: "Computer wins!", variant: "destructive" });
          return;
        }
        if (isBoardFull(aiBoard)) {
          setBoard(aiBoard);
          setGameOver(true);
          setStatus("It's a draw!");
          toast({ title: "It's a draw!" });
          return;
        }

        setBoard(aiBoard);
        setStatus("Your turn (X)");
      }, 300);
    },
    [board, gameOver, toast]
  );

  const reset = () => {
    setBoard(Array(9).fill(null));
    setGameOver(false);
    setStatus("Your turn (X)");
    setWinLine(null);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Status */}
      <div className="mb-4 text-lg font-semibold">
        {status}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => playerMove(i)}
              disabled={!!cell || gameOver}
              className={`aspect-square rounded-xl text-4xl font-bold transition-all duration-200 ${
                isWinCell
                  ? "bg-green-500/30 border-2 border-green-500 scale-95"
                  : cell
                    ? "bg-card border-2 border-border"
                    : "bg-muted/50 border-2 border-border/50 hover:bg-muted cursor-pointer active:scale-95"
              } ${
                cell === "X" ? "text-blue-500" : cell === "O" ? "text-red-500" : ""
              }`}
              aria-label={cell ? `Cell ${cell}` : `Empty cell ${i + 1}`}
            >
              {cell || ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
