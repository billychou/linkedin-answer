import { Game } from "@/types/game";

export const games: Game[] = [
  {
    slug: "pinpoint",
    name: "LinkedIn Pinpoint",
    description:
      "Pinpoint is a word association game where you guess the common category linking five clues. Get free LinkedIn Pinpoint answers and hints every day.",
    playUrl: "https://www.linkedin.com/games/pinpoint/",
    color: "blue",
  },
  {
    slug: "patches",
    name: "LinkedIn Patches",
    description:
      "Patches is a picture puzzle where you drag scattered patches onto a grid to rebuild a hidden image by matching edges and colors. Daily answers inside.",
    playUrl: "https://www.linkedin.com/games/patches/",
    color: "green",
  },
  {
    slug: "zip",
    name: "LinkedIn Zip",
    description:
      "Zip is a path-drawing puzzle where you connect numbered cells in order with one continuous path that fills every cell without crossing itself.",
    playUrl: "https://www.linkedin.com/games/zip/",
    color: "violet",
  },
  {
    slug: "tango",
    name: "LinkedIn Tango",
    description:
      "Tango is a logic puzzle where you fill a 6x6 grid with suns and moons so each row and column has equal counts and no three identical symbols touch.",
    playUrl: "https://www.linkedin.com/games/tango/",
    color: "amber",
  },
  {
    slug: "queens",
    name: "LinkedIn Queens",
    description:
      "Queens is a visual logic game where you place exactly one crown in every row, column, and colored region. Crowns cannot touch each other, even diagonally.",
    playUrl: "https://www.linkedin.com/games/queens/",
    color: "pink",
  },
  {
    slug: "mini-sudoku",
    name: "LinkedIn Mini Sudoku",
    description:
      "Mini Sudoku is a compact 6x6 number puzzle. Fill the grid with digits 1-6 so every row, column, and 2x3 box contains each digit exactly once.",
    playUrl: "https://www.linkedin.com/games/mini-sudoku/",
    color: "cyan",
  },
  {
    slug: "crossclimb",
    name: "LinkedIn Crossclimb",
    description:
      "Crossclimb is a word ladder puzzle where you change one letter at a time to transform words into new words, guided by clues at every step.",
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
