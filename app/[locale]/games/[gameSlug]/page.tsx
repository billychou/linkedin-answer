import AnswerDisplay from "@/components/games/AnswerDisplay";
import ArchivesList from "@/components/games/ArchivesList";
import StructuredData from "@/components/games/StructuredData";
import { Locale } from "@/i18n/routing";
import { getAllAnswers, getAnswerByDate, getTodayAnswer } from "@/lib/answers";
import { getGame } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { Archive, Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; gameSlug: string }>;
  searchParams: Promise<{ date?: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { locale, gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    return constructMetadata({
      page: "Game",
      title: "Game Not Found",
      description: "The requested game could not be found.",
      locale: locale as Locale,
      path: `/games/${gameSlug}`,
    });
  }

  const t = await getTranslations({ locale, namespace: "Games" });

  return constructMetadata({
    page: "Game",
    title: `${game.name} - ${t("todaysAnswer")}`,
    description: game.description,
    locale: locale as Locale,
    path: `/games/${gameSlug}`,
    canonicalUrl: `/games/${gameSlug}`,
  });
}

export default async function GamePage({ params, searchParams }: Props) {
  const { locale, gameSlug } = await params;
  const { date } = await searchParams;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Games" });

  const answer = date
    ? getAnswerByDate(gameSlug as any, date)
    : getTodayAnswer(gameSlug as any);

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
                {t("historicalAnswers")}
              </h2>
            </div>
            <ArchivesList answers={archiveAnswers} gameSlug={gameSlug} />
          </div>
        )}
      </div>
    </>
  );
}
