import { getAllMiniGames } from "@/lib/miniGames";
import GameGrid from "@/components/games/GameGrid";
import MiniGameCard from "@/components/games/MiniGameCard";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Mini Games - Play Free Casual Games Online",
  description: "Play simple casual games for free — Memory Match, 2048, Simon Says and more.",
});

export default function GamesPage() {
  const miniGames = getAllMiniGames();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Play Mini Games Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Play Mini Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {miniGames.map((game) => (
            <MiniGameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* LinkedIn Game Answers Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6">LinkedIn Game Answers</h2>
        <GameGrid />
      </section>
    </div>
  );
}
