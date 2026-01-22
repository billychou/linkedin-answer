import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import GameNavigation from "@/components/games/GameNavigation";
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
      path: `/games/${gameSlug}/how-to-play`,
    });
  }

  const t = await getTranslations({ locale, namespace: "Games" });

  return constructMetadata({
    page: "Game",
    title: `${game.name} - ${t("howToPlay")}`,
    description: `How to play ${game.name}`,
    locale: locale as Locale,
    path: `/games/${gameSlug}/how-to-play`,
    canonicalUrl: `/games/${gameSlug}/how-to-play`,
  });
}

export default async function HowToPlayPage({ params }: Props) {
  const { locale, gameSlug } = await params;
  const game = getGame(gameSlug);

  if (!game) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <GameNavigation game={game} currentPage="how-to-play" />

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100 mb-2">
          {game.name} - How to Play
        </h1>
      </div>

      <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6">
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
          {game.description}
        </p>

        {game.playUrl && (
          <div className="mt-4 sm:mt-6">
            <a
              href={game.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Play {game.name}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
