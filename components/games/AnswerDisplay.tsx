import AnswerReveal from "@/components/games/AnswerReveal";
import { GameAnswer } from "@/types/game";
import CluesDisplay from "./CluesDisplay";

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
      {/* Answer Reveal */}
      <AnswerReveal 
        answer={answer.answer} 
        gameName={gameName}
        sequence={answer.sequence}
        formattedDate={formatDate(answer.date)}
      />

      {/* Hints Display (if available) */}
      {answer.hints && answer.hints.length > 0 && (
        <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6">
          <h4 className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-400 mb-3">
            Hints:
          </h4>
          <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-slate-700 dark:text-slate-300">
            {answer.hints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
      {answer.clues && answer.clues.length > 0 && (
        <CluesDisplay clues={answer.clues} gameName={gameName} clueHint={answer.clueHint} />
      )}
    </div>
  );
}
