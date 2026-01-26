import AnswerDisplay from "@/components/games/AnswerDisplay";
import ArchivesList from "@/components/games/ArchivesList";
import StructuredData from "@/components/games/StructuredData";
import { getAllAnswers, getTodayAnswer } from "@/lib/answers";
import { getGame, getGameSlugs } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { Archive, Calendar } from "lucide-react";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ gameSlug: string }>;
};

export async function generateStaticParams() {
  const gameSlugs = getGameSlugs();
  return gameSlugs.map((slug) => ({
    gameSlug: slug,
  }));
}

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    return constructMetadata({
      page: "Game",
      title: "Game Not Found",
      description: "The requested game could not be found.",
      path: `/games/${gameSlug}`,
    });
  }

  return constructMetadata({
    page: "Game",
    title: `${game.name} - Today's Answer`,
    description: game.description,
    path: `/games/${gameSlug}`,
    canonicalUrl: `/games/${gameSlug}`,
  });
}

export default async function GamePage({ params }: Props) {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  // Static export mode: only show today's answer
  const answer = getTodayAnswer(gameSlug as any);

  // Get all answers and exclude the current one
  const allAnswers = getAllAnswers(gameSlug as any);
  const archiveAnswers = answer
    ? allAnswers.filter((a) => a.date !== answer.date)
    : allAnswers;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <StructuredData game={game} answer={answer} />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-gray-100 mb-3">
            {game.name}
          </h1>
          {answer && (
            <div className="flex items-center gap-2 text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-4">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(answer.date)}</span>
            </div>
          )}
        </div>

        {/* Answer Content */}
        {answer ? (
          <AnswerDisplay answer={answer} gameName={game.name} />
        ) : (
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 sm:p-12 text-center">
            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400">
              No answer available for this date.
            </p>
          </div>
        )}

        {/* Archives Section */}
        {archiveAnswers.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <div className="flex items-center gap-2 mb-6">
              <Archive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100">
                Historical Answers
              </h2>
            </div>
            <ArchivesList answers={archiveAnswers} gameSlug={gameSlug} />
          </div>
        )}
      </div>
    </>
  );
}
