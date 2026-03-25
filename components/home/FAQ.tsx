"use client";

import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    question: "What is LinkedIn Pinpoint?",
    answer:
      "Pinpoint is a daily word association game from LinkedIn. You're given 5 clue words and need to find their common theme or category. A new puzzle is released every day, and players worldwide solve the same puzzle.",
  },
  {
    id: 2,
    question: "How do I play Pinpoint?",
    answer:
      "The game reveals 5 clue words one at a time. Look for connections between them - it could be a category (like 'fruits'), a phrase pattern (like 'words that follow X'), or another creative link. You only get one chance to submit your answer, so think carefully!",
  },
  {
    id: 3,
    question: "Why use this answer website?",
    answer:
      "Some Pinpoint puzzles can be tricky or require specific cultural knowledge. We provide daily answers with detailed explanations to help you learn solving strategies, understand cultural references, or get help when you're stuck. Our goal is to make the game more fun and educational!",
  },
  {
    id: 4,
    question: "When are answers updated?",
    answer:
      "We update answers shortly after LinkedIn releases the new puzzle at midnight Eastern Time (UTC-5/UTC-4). You can typically find today's answer around noon Beijing time. We recommend trying the puzzle yourself first!",
  },
  {
    id: 5,
    question: "Can I view past answers?",
    answer:
      "Absolutely! Click the 'Archives' link to browse all historical Pinpoint answers and clues. It's a great way to practice your pattern recognition skills and see common puzzle themes.",
  },
  {
    id: 6,
    question: "Is this website free?",
    answer:
      "Yes, completely free! All answers, explanations, and archives are accessible without registration or payment. We're here to help LinkedIn game enthusiasts learn and enjoy the games.",
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([1]);

  const toggleItem = (id: number) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100">
          Frequently Asked Questions
        </h2>
      </div>

      {/* FAQ List */}
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900/50 overflow-hidden shadow-xl shadow-blue-900/5">
        {faqData.map((item, index) => {
          const isOpen = openItems.includes(item.id);
          return (
            <div
              key={item.id}
              className={`${
                index !== faqData.length - 1
                  ? "border-b border-blue-200 dark:border-blue-800/50"
                  : ""
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`group w-full flex items-center justify-between p-5 sm:p-6 text-left transition-all duration-200 ${
                  isOpen
                    ? "bg-blue-100/60 dark:bg-blue-900/30 border-l-2 border-l-blue-500"
                    : "hover:bg-blue-500/10 hover:border-l-2 hover:border-l-blue-500 hover:pl-[calc(1.25rem+2px)] sm:hover:pl-[calc(1.5rem+2px)]"
                }`}
                aria-expanded={isOpen}
              >
                <span
                  className={`text-base sm:text-lg pr-4 transition-colors duration-200 ${
                    isOpen
                      ? "font-bold text-blue-600 dark:text-blue-400"
                      : "font-semibold text-slate-900 dark:text-gray-100"
                  }`}
                >
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                    isOpen
                      ? "rotate-180 text-blue-600 dark:text-blue-400"
                      : "text-blue-600 dark:text-blue-400 group-hover:text-blue-400 dark:group-hover:text-blue-300"
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <div className="border-l-2 border-l-blue-500 pl-4">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-slate-800/50 rounded-xl p-4">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
