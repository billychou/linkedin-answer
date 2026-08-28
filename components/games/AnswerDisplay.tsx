import AnswerReveal from "@/components/games/AnswerReveal";
import DailyCheckIn from "@/components/games/DailyCheckIn";
import { GameAnswer } from "@/types/game";
import CluesDisplay from "./CluesDisplay";
import SudokuGrid from "./SudokuGrid";
import Image from "next/image";

interface AnswerDisplayProps {
  answer: GameAnswer;
  gameName: string;
}

export default function AnswerDisplay({ answer, gameName }: AnswerDisplayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* 每日打卡（静默、幂等；有 streak 时展示小火苗） */}
      <DailyCheckIn />

      {/* Clues first (context before reveal) */}
      {answer.clues && answer.clues.length > 0 && (
        <CluesDisplay clues={answer.clues} gameName={gameName} clueHint={answer.clueHint} />
      )}

      {/* Image Display (if available) */}
      {answer.image && (
        <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6 overflow-hidden">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <Image
              src={answer.image}
              alt={`${gameName} answer for ${formatDate(answer.date)}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
        </div>
      )}

      {/* Solution Grid Display (mini-sudoku) */}
      {answer.grid && (
        <SudokuGrid grid={answer.grid} gameName={gameName} sequence={answer.sequence} />
      )}

      {/* Answer Reveal */}
      <AnswerReveal
        answer={answer.answer}
        gameName={gameName}
        sequence={answer.sequence}
        formattedDate={formatDate(answer.date)}
      />

      {/* Solution walkthrough for games without clues (Queens, Tango, Zip, ...) */}
      {answer.clueHint && !(answer.clues && answer.clues.length > 0) && (
        <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
          <h4 className="text-sm sm:text-base font-medium text-muted-foreground mb-3">
            How to solve it:
          </h4>
          <div
            className="text-sm sm:text-base text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_strong]:font-semibold [&_strong]:text-foreground"
            dangerouslySetInnerHTML={{ __html: answer.clueHint }}
          />
        </div>
      )}

      {/* Hints Display (if available) */}
      {answer.hints && answer.hints.length > 0 && (
        <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
          <h4 className="text-sm sm:text-base font-medium text-muted-foreground mb-3">
            Hints:
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground">
            {answer.hints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
