import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { getAllAnswers } from "@/lib/answers";
import ArchivesList from "@/components/games/ArchivesList";
import { constructMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; gameSlug: string }>;
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
      path: `/games/${gameSlug}/archives`,
    });
  }

  const t = await getTranslations({ locale, namespace: "Games" });

  return constructMetadata({
    page: "Game",
    title: `${game.name} - ${t("archives")}`,
    description: `Historical answers for ${game.name}`,
    locale: locale as Locale,
    path: `/games/${gameSlug}/archives`,
    canonicalUrl: `/games/${gameSlug}/archives`,
  });
}

export default async function ArchivesPage({ params }: Props) {
  const { locale, gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  const answers = getAllAnswers(gameSlug as any);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100 mb-2">
          {game.name} - Archives
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Browse historical answers for {game.name}
        </p>
      </div>

      <ArchivesList answers={answers} gameSlug={gameSlug} />
    </div>
  );
}
