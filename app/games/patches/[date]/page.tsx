import AnswerDisplay from "@/components/games/AnswerDisplay";
import StructuredData from "@/components/games/StructuredData";
import GameNavigation from "@/components/games/GameNavigation";
import { getAnswerByDate, getAllAnswers } from "@/lib/answers";
import { getGame } from "@/lib/games";
import { constructMetadata } from "@/lib/metadata";
import { Calendar } from "lucide-react";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ date: string }>;
};

export async function generateStaticParams() {
  const answers = getAllAnswers("patches");
  return answers.map((answer) => ({ date: answer.date }));
}

export async function generateMetadata({
  params,
}: Props): Promise<ReturnType<typeof constructMetadata>> {
  const { date } = await params;
  const game = getGame("patches");
  const answer = getAnswerByDate("patches", date);

  if (!game || !answer) {
    return constructMetadata({
      page: "Game",
      title: "Answer Not Found",
      description: "The requested answer could not be found.",
      path: `/games/patches/${date}`,
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
    path: `/games/patches/${date}`,
    canonicalUrl: `/games/patches/${date}`,
  });
}

export default async function PatchesDatePage({ params }: Props) {
  const { date } = await params;
  const game = getGame("patches");
  const answer = getAnswerByDate("patches", date);

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
      </div>
    </>
  );
}
