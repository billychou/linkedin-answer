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
  {
    slug: "patches",
    name: "LinkedIn Patches",
    description:
      "Patches is a spatial logic puzzle where you fill a 5x5 grid with rectangles and squares based on clues. Each region has a clue telling you either the number of cells to cover or the shape type (rectangle or square). Fill the entire grid with no overlaps and no gaps.",
    playUrl: "https://www.linkedin.com/games/patches/",
    color: "green",
  },
  {
    slug: "zip",
    name: "LinkedIn Zip",
    description:
      "Zip is a path-drawing puzzle where you connect numbered cells in sequential order with a single continuous path. The path must fill every cell on the grid without crossing itself.",
    playUrl: "https://www.linkedin.com/games/zip/",
    color: "violet",
  },
  {
    slug: "tango",
    name: "LinkedIn Tango",
    description:
      "Tango is a logic puzzle where you fill a 6x6 grid with suns (☀️) and moons (🌑). Each row and column must have an equal number of suns and moons, and no more than two identical symbols can be adjacent.",
    playUrl: "https://www.linkedin.com/games/tango/",
    color: "amber",
  },
  {
    slug: "queens",
    name: "LinkedIn Queens",
    description:
      "Queens is a visual logic game where you place exactly one Crown (👑) in every row, column, and colored region. Crowns cannot touch each other, even diagonally.",
    playUrl: "https://www.linkedin.com/games/queens/",
    color: "pink",
  },
  {
    slug: "crossclimb",
    name: "LinkedIn Crossclimb",
    description:
      "Crossclimb is a word ladder puzzle where you transform one word into another by changing a single letter at each step. Each intermediate word must be a valid English word, with clues guiding you along the way.",
    playUrl: "https://www.linkedin.com/games/crossclimb/",
    color: "orange",
  },
];

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getAllGames(): Game[] {
  return games;
}
