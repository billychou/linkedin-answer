import { games, getGameBySlug } from "@/data/games";
import { Game, GameSlug } from "@/types/game";

export function getAllGames(): Game[] {
  return games;
}

export function getGame(slug: string): Game | undefined {
  return getGameBySlug(slug);
}

export function getGameSlugs(): GameSlug[] {
  return games.map((game) => game.slug);
}
