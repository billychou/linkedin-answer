import AnswerDisplay from "@/components/games/AnswerDisplay";
import ArchivesList from "@/components/games/ArchivesList";
import GameNavigation from "@/components/games/GameNavigation";
import GameSidebar from "@/components/games/GameSidebar";
import StructuredData from "@/components/games/StructuredData";
import { getAllAnswers, getTodayAnswer } from "@/lib/answers";
import { getGame, getGameSlugs } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { Archive } from "lucide-react";
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

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Games", url: "/games" },
    { label: game.name, url: `/games/${gameSlug}` },
  ];

  return (
    <>
      <StructuredData game={game} answer={answer} breadcrumbs={breadcrumbs} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <GameNavigation game={game} currentPage="answer" />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column */}
          <div>
            <div className="mb-6 sm:mb-8">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {game.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {game.description}
              </p>
            </div>

            {answer ? (
              <AnswerDisplay answer={answer} gameName={game.name} />
            ) : (
              <div className="rounded-xl border-2 border-border bg-card p-8 text-center sm:p-12">
                <p className="text-lg text-muted-foreground sm:text-xl">
                  No answer available for this date.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <GameSidebar game={game} answer={answer} allAnswers={allAnswers} />
        </div>

        {/* Archives Section */}
        {archiveAnswers.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <div className="mb-6 flex items-center gap-2">
              <Archive className="h-6 w-6 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
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
