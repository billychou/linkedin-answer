import { getMiniGame, getAllMiniGames } from "@/lib/miniGames";
import { MiniGameId } from "@/data/miniGames";
import GamePlayShell from "@/components/games/GamePlayShell";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { constructMetadata } from "@/lib/metadata";

const gameComponents: Record<MiniGameId, React.ComponentType<Record<string, never>>> = {
  "memory-match": dynamic(() => import("@/components/games/mini-games/MemoryMatch")),
  "2048": dynamic(() => import("@/components/games/mini-games/Game2048")),
  "simon-says": dynamic(() => import("@/components/games/mini-games/SimonSays")),
};

export function generateStaticParams() {
  return getAllMiniGames().map((game) => ({ gameId: game.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: MiniGameId }> }) {
  const { gameId } = await params;
  const game = getMiniGame(gameId);
  if (!game) return constructMetadata({ title: "Game Not Found" });
  return constructMetadata({
    title: `Play ${game.name} - Free Casual Game`,
    description: game.description,
  });
}

export default async function GamePlayPage({ params }: { params: Promise<{ gameId: MiniGameId }> }) {
  const { gameId } = await params;
  const game = getMiniGame(gameId);
  if (!game) notFound();

  const GameComponent = gameComponents[gameId];
  if (!GameComponent) notFound();

  return (
    <GamePlayShell game={game}>
      <GameComponent />
    </GamePlayShell>
  );
}
