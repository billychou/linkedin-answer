import { notFound } from "next/navigation";
import { getGame, getGameSlugs } from "@/lib/games";
import { getAllAnswers } from "@/lib/answers";
import ArchivesList from "@/components/games/ArchivesList";
import StructuredData from "@/components/games/StructuredData";
import { constructMetadata } from "@/lib/metadata";

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
      path: `/games/${gameSlug}/archives`,
    });
  }

  return constructMetadata({
    page: "Game",
    title: `${game.name} - Archives`,
    description: `Browse all historical answers for ${game.name} — updated daily with solutions and explanations.`,
    path: `/games/${gameSlug}/archives`,
    canonicalUrl: `/games/${gameSlug}/archives`,
  });
}

export default async function ArchivesPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const answers = getAllAnswers(gameSlug as any);

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Games", url: "/games" },
    { label: game.name, url: `/games/${gameSlug}` },
    { label: "Archives", url: `/games/${gameSlug}/archives` },
  ];

  const collectionItems = answers.map((a) => ({
    label: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    url: `/games/${gameSlug}/${a.date}`,
    date: a.date,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <StructuredData
        game={game}
        breadcrumbs={breadcrumbs}
        collectionItems={collectionItems}
      />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100 mb-2">
          {game.name} - Archives
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Browse all historical answers for {game.name}
        </p>
      </div>

      <ArchivesList answers={answers} gameSlug={gameSlug} />
    </div>
  );
}
