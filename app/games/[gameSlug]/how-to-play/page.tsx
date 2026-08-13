import { notFound } from "next/navigation";
import { getGame, getGameSlugs } from "@/lib/games";
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
      path: `/games/${gameSlug}/how-to-play`,
    });
  }

  return constructMetadata({
    page: "Game",
    title: `${game.name} - How to Play`,
    description: `Learn how to play ${game.name}. Rules, tips, and strategies for solving this LinkedIn puzzle game.`,
    path: `/games/${gameSlug}/how-to-play`,
    canonicalUrl: `/games/${gameSlug}/how-to-play`,
  });
}

export default async function HowToPlayPage({ params }: Props) {
  const { gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: "Games", url: "/games" },
    { label: game.name, url: `/games/${gameSlug}` },
    { label: "How to Play", url: `/games/${gameSlug}/how-to-play` },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <StructuredData
        game={game}
        breadcrumbs={breadcrumbs}
        type="FAQPage"
      />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {game.name} - How to Play
        </h1>
      </div>

      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
          {game.description}
        </p>

        {game.playUrl && (
          <div className="mt-4 sm:mt-6">
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Play {game.name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
