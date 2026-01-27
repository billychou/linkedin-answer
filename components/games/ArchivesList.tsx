import { GameAnswer } from "@/types/game";
import { Calendar } from "lucide-react";

interface ArchivesListProps {
  answers: GameAnswer[];
  gameSlug: string;
}

export default function ArchivesList({ answers, gameSlug }: ArchivesListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (answers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No archived answers available.
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {answers.map((answer) => {
        const isArray = Array.isArray(answer.answer);
        return (
          <a
            key={answer.date}
            href={`/games/${gameSlug}/${answer.date}`}
            className="block rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(answer.date)}</span>
                </div>
                {isArray ? (
                  <div className="flex flex-wrap gap-2">
                    {(answer.answer as string[]).map((item: string, index: number) => (
                      <span
                        key={index}
                        className="inline-block px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded font-medium text-xs sm:text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-gray-100 break-words">
                    {typeof answer.answer === "string" ? answer.answer : ""}
                  </p>
                )}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
