import { Game } from "@/types/game";

export const games: Game[] = [
  {
    slug: "pinpoint",
    name: "LinkedIn Pinpoint",
    description:
      "Pinpoint is a word association game where you try to guess the common category or theme linking a set of words. You're given five clues to figure out this common category.",
    playUrl: "https://www.linkedin.com/games/pinpoint/",
    color: "blue",
  }
  // {
  //   slug: "crossclimb",
  //   name: "LinkedIn Crossclimb",
  //   description:
  //     "Crossclimb is a trivia game from LinkedIn inspired by a mini crossword, but with a twist! Answer each clue, then organize the rows into a word ladder, where each word is just one letter different from the one before or after it.",
  //   playUrl: "https://www.linkedin.com/games/crossclimb/",
  //   color: "purple",
  // },
  // {
  //   slug: "zip",
  //   name: "LinkedIn ZIP",
  //   description:
  //     "Zip is a visual logic game where you need to plot a path through the grid while passing through each number in order.",
  //   playUrl: "https://www.linkedin.com/games/zip/",
  //   color: "green",
  // },
  // {
  //   slug: "queens",
  //   name: "LinkedIn Queens",
  //   description:
  //     "Queens is a visual logic game from LinkedIn where you need to fill the grid so that there is one Queen (👑) in each row, column, and colored region with no 👑 touching another (even diagonally).",
  //   playUrl: "https://www.linkedin.com/games/queens/",
  //   color: "pink",
  // },
  // {
  //   slug: "tango",
  //   name: "LinkedIn Tango",
  //   description:
  //     "Tango is a logic game from LinkedIn where you need to fill a grid so that each row and column contains the same number of suns (☀️) and moons (🌙). No more than 2 ☀️ or 🌙 may be next to each other, either vertically or horizontally.",
  //   playUrl: "https://www.linkedin.com/games/tango/",
  //   color: "yellow",
  // }
];

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getAllGames(): Game[] {
  return games;
}
