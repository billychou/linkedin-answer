"use client";

import { GameAnswer } from "@/types/game";
import { Calendar } from "lucide-react";
import { useMemo, useState } from "react";

interface ArchivesListProps {
  answers: GameAnswer[];
  gameSlug: string;
}

const ITEMS_PER_PAGE = 10;

export default function ArchivesList({ answers, gameSlug }: ArchivesListProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Extract unique months from answers for filter
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    answers.forEach((answer) => {
      const date = new Date(answer.date);
      const monthYear = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      monthsSet.add(monthYear);
    });
    return Array.from(monthsSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [answers]);

  // Filter answers by selected month
  const filteredAnswers = useMemo(() => {
    if (selectedMonth === "all") {
      return answers;
    }
    return answers.filter((answer) => {
      const date = new Date(answer.date);
      const monthYear = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      return monthYear === selectedMonth;
    });
  }, [answers, selectedMonth]);

  // Get visible answers based on pagination
  const visibleAnswers = filteredAnswers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAnswers.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setVisibleCount(ITEMS_PER_PAGE); // Reset pagination when filter changes
  };

  if (answers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No archived answers available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="month-filter"
          className="text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          Filter by month:
        </label>
        <select
          id="month-filter"
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="all">All</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          ({filteredAnswers.length} results)
        </span>
      </div>

      {/* Answers List */}
      <div className="space-y-3 sm:space-y-4">
        {visibleAnswers.map((answer) => {
          const isArray = Array.isArray(answer.answer);
          return (
            <a
              key={answer.date}
              href={`/games/${gameSlug}/${answer.date}`}
              className="block rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs sm:text-sm mb-2">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-blue-400" />
                    <span className="text-blue-400 font-medium">{formatDate(answer.date)}</span>
                  </div>
                  {isArray ? (
                    <div className="flex flex-wrap gap-2">
                      {(answer.answer as string[]).map((item: string, index: number) => (
                        <span
                          key={index}
                          className="inline-block px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded font-semibold text-xs sm:text-sm"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-gray-100 break-words">
                      {typeof answer.answer === "string" ? answer.answer : ""}
                    </p>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Show More / No More Button */}
      <div className="flex justify-center pt-4">
        {hasMore ? (
          <button
            onClick={handleShowMore}
            className="px-6 py-2 rounded-lg border-2 border-blue-400 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-300 transition-all duration-200 font-medium"
          >
            Show More
          </button>
        ) : filteredAnswers.length > ITEMS_PER_PAGE ? (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            No more answers
          </span>
        ) : null}
      </div>
    </div>
  );
}
