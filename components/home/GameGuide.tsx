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
    icon: <List className="w-6 h-6 lg:w-5 lg:h-5" />,
    title: "Observe the Clues",
    description:
      "The game presents 5 clue words one by one. Read each clue carefully and look for connections - they might come from different fields like culture, language, or science.",
  },
  {
    step: 2,
    icon: <Lightbulb className="w-6 h-6 lg:w-5 lg:h-5" />,
    title: "Find the Connection",
    description:
      "Think about what these clues have in common. It could be a category (like 'types of fruit') or a phrase pattern (like 'words that follow sweet').",
  },
  {
    step: 3,
    icon: <PenTool className="w-6 h-6 lg:w-5 lg:h-5" />,
    title: "Submit Your Answer",
    description:
      "Once you've figured it out, type your answer. You only get one chance to submit, so make sure you're confident before hitting enter!",
  },
  {
    step: 4,
    icon: <Target className="w-6 h-6 lg:w-5 lg:h-5" />,
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
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            How to Play Pinpoint
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick guide to get you started
          </p>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="rounded-2xl border-2 border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-card dark:from-primary/10 dark:to-card p-4 sm:p-6 shadow-xl shadow-primary/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-4">
          {guideSteps.map((step) => (
            <div
              key={step.step}
              className="relative bg-card rounded-xl p-4 sm:p-5 lg:p-4 border-2 border-primary/20 dark:border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Step Number Badge */}
              <div className="absolute -top-3 -left-3 w-7 h-7 lg:w-6 lg:h-6 bg-primary dark:bg-primary rounded-full flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-sm lg:text-xs">{step.step}</span>
              </div>

              {/* Icon */}
              <div className="mb-3 lg:mb-2 p-2.5 lg:p-2 bg-primary/10 rounded-xl w-fit text-primary">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-base lg:text-sm font-bold text-foreground mb-2 lg:mb-1">
                {step.title}
              </h3>
              <p className="text-sm lg:text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mt-4 p-3 sm:p-4 bg-primary/10 rounded-xl">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-primary">
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
