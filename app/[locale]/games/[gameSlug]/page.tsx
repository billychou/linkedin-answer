import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { getTodayAnswer, getAnswerByDate } from "@/lib/answers";
import AnswerDisplay from "@/components/games/AnswerDisplay";
import GameNavigation from "@/components/games/GameNavigation";
import StructuredData from "@/components/games/StructuredData";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n/routing";
import { Calendar } from "lucide-react";

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

  const answer = date
    ? getAnswerByDate(gameSlug as any, date)
    : getTodayAnswer(gameSlug as any);

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
        <GameNavigation game={game} currentPage="answer" />

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
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            {game.description}
          </p>
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
      </div>
    </>
  );
}
