import { getAllMiniGames } from "@/lib/miniGames";
import GameGrid from "@/components/games/GameGrid";
import MiniGameCard from "@/components/games/MiniGameCard";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  page: "Games",
  title: "LinkedIn Games - Daily Answers & Solutions",
  description: "Browse daily answers for all LinkedIn games — Pinpoint, Crossclimb, Zip, Tango, Queens, and Patches. Play mini games and check today's solutions.",
});

export default function GamesPage() {
  const miniGames = getAllMiniGames();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Page Header */}
      <section className="text-center py-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-gray-100 mb-3">
          LinkedIn Game Answers & Mini Games
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Check today&apos;s answers for all LinkedIn puzzle games or play our free mini games. Updated daily with solutions and explanations.
        </p>
      </section>

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
