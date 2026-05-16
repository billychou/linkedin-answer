import { getMiniGame, getAllMiniGames } from "@/lib/miniGames";
import { MiniGameId } from "@/data/miniGames";
import GamePlayShell from "@/components/games/GamePlayShell";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import { Gamepad2, HelpCircle, Lightbulb } from "lucide-react";
import Link from "next/link";

const gameComponents: Record<MiniGameId, React.ComponentType<Record<string, never>>> = {
  "memory-match": dynamic(() => import("@/components/games/mini-games/MemoryMatch")),
  "2048": dynamic(() => import("@/components/games/mini-games/Game2048")),
  "simon-says": dynamic(() => import("@/components/games/mini-games/SimonSays")),
  "tic-tac-toe": dynamic(() => import("@/components/games/mini-games/TicTacToe")),
};

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

  return (
    <>
      <GameStructuredData game={game} />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground">
          <Link href="/games" className="hover:text-foreground transition-colors">Games</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{game.name}</span>
        </nav>

        {/* Hero Section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold">{game.name}</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{game.description}</p>
        </div>

        {/* CTA - Start Game Button */}
        <div className="flex justify-center">
          <a
            href="#game-area"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <Gamepad2 className="h-5 w-5" />
            Play Now
          </a>
        </div>

        {/* How to Play Section */}
        <section id="how-to-play" className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">How to Play</h2>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              {game.howToPlay.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tips Section */}
        {game.tips && game.tips.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-semibold">Pro Tips</h2>
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-2">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {game.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Game Area */}
        <section id="game-area" className="scroll-mt-8">
          <GamePlayShell>
            <GameComponent />
          </GamePlayShell>
        </section>
      </div>
    </>
  );
}
