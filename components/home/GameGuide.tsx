import { BookOpen, Lightbulb, List, PenTool, Target } from "lucide-react";

interface GuideStep {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const guideSteps: GuideStep[] = [
  {
    step: 1,
    icon: <List className="w-6 h-6" />,
    title: "Observe the Clues",
    description:
      "The game presents 5 clue words one by one. Read each clue carefully and look for connections - they might come from different fields like culture, language, or science.",
  },
  {
    step: 2,
    icon: <Lightbulb className="w-6 h-6" />,
    title: "Find the Connection",
    description:
      "Think about what these clues have in common. It could be a category (like 'types of fruit') or a phrase pattern (like 'words that follow sweet').",
  },
  {
    step: 3,
    icon: <PenTool className="w-6 h-6" />,
    title: "Submit Your Answer",
    description:
      "Once you've figured it out, type your answer. You only get one chance to submit, so make sure you're confident before hitting enter!",
  },
  {
    step: 4,
    icon: <Target className="w-6 h-6" />,
    title: "See the Result",
    description:
      "After submitting, you'll see if you got it right. Share your result on LinkedIn and come back tomorrow for a new challenge!",
  },
];

export default function GameGuide() {
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100">
            How to Play Pinpoint
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quick guide to get you started
          </p>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900/50 p-6 sm:p-8 shadow-xl shadow-blue-900/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {guideSteps.map((step) => (
            <div
              key={step.step}
              className="relative bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 border-2 border-blue-100 dark:border-blue-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Step Number Badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">{step.step}</span>
              </div>

              {/* Icon */}
              <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl w-fit text-blue-600 dark:text-blue-400">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-6 p-4 bg-blue-100/50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Pro tip:
            </span>{" "}
            Difficulty varies daily - some puzzles require specific cultural knowledge. 
            If you&apos;re stuck, check our answers and explanations to learn new solving strategies!
          </p>
        </div>
      </div>
    </div>
  );
}
