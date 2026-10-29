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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {game.name} - Archives
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Every daily {game.name} answer in one place — browse past solutions by
          date, revisit the clues, hints and full explanations, and catch up on
          any puzzle you missed. New answers are added automatically as soon as
          LinkedIn publishes each daily game.
        </p>
      </div>

      <div className="mb-6 space-y-5 rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <section>
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            What you&apos;ll find here
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            This archive is the complete history of daily {game.name} puzzles.
            Each entry links to the full answer page for that date, which
            includes the official solution plus any clues, hints, and
            walkthroughs shared for that day&apos;s puzzle. Whatever date you are
            looking for, you can jump straight to it from the list below.
          </p>
          <ul className="mt-3 list-disc list-inside space-y-1.5 text-sm sm:text-base text-muted-foreground">
            <li>Every daily answer, organized by date (newest first)</li>
            <li>Clues and hints for each puzzle where available</li>
            <li>Solution grids and images for visual puzzles</li>
            <li>Free to browse — no account or sign-in required</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            How to use the archives
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Use the month filter to narrow the list down to a specific period,
            then click any date to open that day&apos;s answer. From an answer
            page you can also move one day forward or backward, or jump back to
            today&apos;s {game.name} answer at any time. Because LinkedIn publishes
            one puzzle each day, a new archive entry appears here every single
            day.
          </p>
        </section>
      </div>

      <ArchivesList answers={answers} gameSlug={gameSlug} />
    </div>
  );
}
