import { getMiniGame, getAllMiniGames } from "@/lib/miniGames";
import { MiniGameId } from "@/data/miniGames";
import GamePlayShell from "@/components/games/GamePlayShell";
import GameGuidePanel from "@/components/games/GameGuidePanel";
import MoreMiniGames from "@/components/games/MoreMiniGames";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import { MonitorSmartphone, Sparkles, User } from "lucide-react";
import Link from "next/link";

const gameComponents: Record<MiniGameId, React.ComponentType<Record<string, never>>> = {
  "memory-match": dynamic(() => import("@/components/games/mini-games/MemoryMatch")),
  "2048": dynamic(() => import("@/components/games/mini-games/Game2048")),
  "simon-says": dynamic(() => import("@/components/games/mini-games/SimonSays")),
  "tic-tac-toe": dynamic(() => import("@/components/games/mini-games/TicTacToe")),
};

const gameBadges = [
  { icon: Sparkles, label: "Free to play" },
  { icon: User, label: "Single player" },
  { icon: MonitorSmartphone, label: "Desktop & mobile" },
];

export function generateStaticParams() {
  return getAllMiniGames().map((game) => ({ gameId: game.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: MiniGameId }> }) {
  const { gameId } = await params;
  const game = getMiniGame(gameId);
  if (!game) return constructMetadata({ title: "Game Not Found" });
  return constructMetadata({
    title: `Play ${game.name} Online - Free Casual Mini Game`,
    description: game.description,
    path: `/games/play/${gameId}`,
  });
}

function GameStructuredData({ game }: { game: NonNullable<ReturnType<typeof getMiniGame>> }) {
  const url = `${siteConfig.url}/games/play/${game.id}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description: game.description,
    url,
    gamePlatform: "Web browser",
    genre: "Casual",
    numberOfPlayers: "SinglePlayer",
    applicationCategory: "Game",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function GamePlayPage({ params }: { params: Promise<{ gameId: MiniGameId }> }) {
  const { gameId } = await params;
  const game = getMiniGame(gameId);
  if (!game) notFound();

  const GameComponent = gameComponents[gameId];
  if (!GameComponent) notFound();

  const otherGames = getAllMiniGames().filter((other) => other.id !== gameId);

  return (
    <>
      <GameStructuredData game={game} />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
          <Link href="/games" className="transition-colors hover:text-foreground">
            Games
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-foreground">{game.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-6 space-y-3 sm:mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {game.name}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{game.description}</p>
          <ul className="flex flex-wrap items-center gap-2 pt-1">
            {gameBadges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </header>

        {/* Game board (left) + game guide (right); stacked on mobile */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="contents lg:block lg:min-w-0 lg:space-y-5 xl:space-y-6">
            <section id="game-area" className="order-1 min-w-0 scroll-mt-24 lg:order-none">
              <GamePlayShell>
                <GameComponent />
              </GamePlayShell>
            </section>
            <div className="order-3 min-w-0 lg:order-none">
              <MoreMiniGames games={otherGames} />
            </div>
          </div>

          <div className="order-2 min-w-0 lg:order-none">
            <GameGuidePanel game={game} />
          </div>
        </div>
      </div>
    </>
  );
}
