import { miniGames, MiniGame, MiniGameId } from "@/data/miniGames";

export function getAllMiniGames(): MiniGame[] {
  return miniGames;
}

export function getMiniGame(id: MiniGameId): MiniGame | undefined {
  return miniGames.find((game) => game.id === id);
}
