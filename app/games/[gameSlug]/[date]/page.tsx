import AnswerDisplay from "@/components/games/AnswerDisplay";
import StructuredData from "@/components/games/StructuredData";
import GameNavigation from "@/components/games/GameNavigation";
import { getAnswerByDate, getAllAnswers } from "@/lib/answers";
import { getGame, getGameSlugs } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ gameSlug: string; date: string }>;
};

export async function generateStaticParams() {
  return getGameSlugs().flatMap((slug) =>
    getAllAnswers(slug).map((answer) => ({ gameSlug: slug, date: answer.date }))
  );
}

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { gameSlug, date } = await params;
  const game = getGame(gameSlug);
  const answer = getAnswerByDate(gameSlug as any, date);

  if (!game || !answer) {
    return constructMetadata({
      page: "Game",
      title: "Answer Not Found",
      description: "The requested answer could not be found.",
      path: `/games/${gameSlug}/${date}`,
    });
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

export default async function GameDatePage({ params }: Props) {
  const { gameSlug, date } = await params;
  const game = getGame(gameSlug);
  const answer = getAnswerByDate(gameSlug as any, date);

  if (!game || !answer) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Games", url: "/games" },
    { label: game.name, url: `/games/${game.slug}` },
    { label: formatDate(date), url: `/games/${game.slug}/${date}` },
  ];

  // Answers are sorted date-descending, so the previous day sits one index higher
  const allAnswers = getAllAnswers(gameSlug as any);
  const index = allAnswers.findIndex((a) => a.date === date);
  const newerAnswer = index > 0 ? allAnswers[index - 1] : undefined;
  const olderAnswer =
    index >= 0 && index < allAnswers.length - 1
      ? allAnswers[index + 1]
      : undefined;

  const sameDayAnswers = getGameSlugs()
    .filter((slug) => slug !== gameSlug)
    .map((slug) => ({ game: getGame(slug), answer: getAnswerByDate(slug, date) }))
    .filter(
      (item): item is { game: NonNullable<ReturnType<typeof getGame>>; answer: NonNullable<ReturnType<typeof getAnswerByDate>> } =>
        Boolean(item.game && item.answer)
    );

  return (
    <>
      <StructuredData
        game={game}
        answer={answer}
        breadcrumbs={breadcrumbs}
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <GameNavigation game={game} currentPage="answer" />

        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            {game.name}
          </h1>
          <div className="flex items-center gap-2 text-base sm:text-lg text-muted-foreground mb-4">
            <Calendar className="w-5 h-5" />
            <span>{formatDate(answer.date)}</span>
          </div>
        </div>

        <AnswerDisplay answer={answer} gameName={game.name} />

        <nav
          aria-label="Answer navigation"
          className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6"
        >
          {olderAnswer ? (
            <Link
              href={`/games/${game.slug}/${olderAnswer.date}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {formatDate(olderAnswer.date)}
            </Link>
          ) : (
            <span />
          )}
          {newerAnswer ? (
            <Link
              href={`/games/${game.slug}/${newerAnswer.date}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {formatDate(newerAnswer.date)}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>

        {sameDayAnswers.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              More answers for {formatDate(date)}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every LinkedIn game publishes a new puzzle each day. Here are the
              other games&apos; answers for the same date — or see{" "}
              <Link href="/today" className="text-primary underline-offset-4 hover:underline">
                all of today&apos;s answers
              </Link>
              .
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sameDayAnswers.map(({ game: otherGame, answer: otherAnswer }) => (
                <Link
                  key={otherGame.slug}
                  href={`/games/${otherGame.slug}/${otherAnswer.date}`}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <p className="font-medium text-foreground group-hover:text-primary">
                    {otherGame.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {Array.isArray(otherAnswer.answer)
                      ? otherAnswer.answer.join(", ")
                      : otherAnswer.answer}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
