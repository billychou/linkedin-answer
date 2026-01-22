import { GameAnswer } from "@/types/game";
import { Calendar } from "lucide-react";

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

  const isArray = Array.isArray(answer.answer);

  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(answer.date)}</span>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {gameName} Answer:
          </h3>
          {isArray ? (
            <div className="flex flex-wrap gap-2">
              {answer.answer.map((item, index) => (
                <span
                  key={index}
                  className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg font-semibold text-sm sm:text-base"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-gray-100 break-words">
              {answer.answer}
            </p>
          )}
        </div>

        {answer.hints && answer.hints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Hints:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
              {answer.hints.map((hint, index) => (
                <li key={index}>{hint}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
