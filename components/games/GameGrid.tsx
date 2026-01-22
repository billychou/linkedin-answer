import { getAllGames } from "@/lib/games";
import GameCard from "./GameCard";

export default function GameGrid() {
  const games = getAllGames();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GameCard key={game.slug} game={game} />
      ))}
    </div>
  );
}
