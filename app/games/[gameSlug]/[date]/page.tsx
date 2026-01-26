import AnswerDisplay from "@/components/games/AnswerDisplay";
import StructuredData from "@/components/games/StructuredData";
import GameNavigation from "@/components/games/GameNavigation";
import { getAnswerByDate } from "@/lib/answers";
import { getGame, getGameSlugs } from "@/lib/games";
import { getAllAnswers } from "@/lib/answers";
import { constructMetadata } from "@/lib/metadata";
import { Calendar } from "lucide-react";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ gameSlug: string; date: string }>;
};

export async function generateStaticParams() {
  const gameSlugs = getGameSlugs();
  const params: { gameSlug: string; date: string }[] = [];

  // Generate params for all games and their dates
  for (const slug of gameSlugs) {
    const answers = getAllAnswers(slug as any);
    for (const answer of answers) {
      params.push({
        gameSlug: slug,
        date: answer.date,
      });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { gameSlug, date } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    return constructMetadata({
      page: "Game",
      title: "Game Not Found",
      description: "The requested game could not be found.",
      path: `/games/${gameSlug}/${date}`,
    });
  }

  const answer = getAnswerByDate(gameSlug as any, date);

  if (!answer) {
    return constructMetadata({
      page: "Game",
      title: "Answer Not Found",
      description: "The requested answer could not be found.",
      path: `/games/${gameSlug}/${date}`,
    });
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return constructMetadata({
    page: "Game",
    title: `${game.name} - ${formatDate(date)}`,
    description: `Answer for ${game.name} on ${formatDate(date)}`,
    path: `/games/${gameSlug}/${date}`,
    canonicalUrl: `/games/${gameSlug}/${date}`,
  });
}

export default async function DatePage({ params }: Props) {
  const { gameSlug, date } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const answer = getAnswerByDate(gameSlug as any, date);

  if (!answer) {
    notFound();
  }

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
        {/* Navigation */}
        <GameNavigation game={game} currentPage="answer" />

        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-gray-100 mb-3">
            {game.name}
          </h1>
          <div className="flex items-center gap-2 text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-4">
            <Calendar className="w-5 h-5" />
            <span>{formatDate(answer.date)}</span>
          </div>
        </div>

        {/* Answer Content */}
        <AnswerDisplay answer={answer} gameName={game.name} />
      </div>
    </>
  );
}
