import { Game } from "@/types/game";

export const games: Game[] = [
  {
    slug: "pinpoint",
    name: "LinkedIn Pinpoint",
    description:
      "Pinpoint is a word association game where you try to guess the common category or theme linking a set of words. You're given five clues to figure out this common category.",
    playUrl: "https://www.linkedin.com/games/pinpoint/",
    color: "blue",
  },
  // {
  //   slug: "queens",
  //   name: "LinkedIn Queens",
  //   description:
  //     "Queens is a visual logic game from LinkedIn where you need to fill the grid so that there is one Queen (👑) in each row, column, and colored region with no 👑 touching another (even diagonally).",
  //   playUrl: "https://www.linkedin.com/games/queens/",
  //   color: "pink",
  // },
];

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getAllGames(): Game[] {
  return games;
}
