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
    slug: "crossclimb",
    name: "LinkedIn Crossclimb",
    description:
      "Crossclimb is a trivia game from LinkedIn inspired by a mini crossword, but with a twist! Answer each clue, then organize the rows into a word ladder, where each word is just one letter different from the one before or after it.",
    playUrl: "https://www.linkedin.com/games/crossclimb/",
    color: "purple",
  },
  {
    slug: "zip",
    name: "LinkedIn ZIP",
    description:
      "Zip is a visual logic game where you need to plot a path through the grid while passing through each number in order.",
    playUrl: "https://www.linkedin.com/games/zip/",
    color: "green",
  },
  {
    slug: "mini-sudoku",
    name: "LinkedIn Mini Sudoku",
    description:
      "Mini Sudoku is a bite-sized take on the classic logic game where each row, column, and region must contain every digit exactly once.",
    playUrl: "https://www.linkedin.com/games/mini-sudoku/",
    color: "orange",
  },
  {
    slug: "queens",
    name: "LinkedIn Queens",
    description:
      "Queens is a visual logic game from LinkedIn where you need to fill the grid so that there is one Queen (👑) in each row, column, and colored region with no 👑 touching another (even diagonally).",
    playUrl: "https://www.linkedin.com/games/queens/",
    color: "pink",
  },
  {
    slug: "tango",
    name: "LinkedIn Tango",
    description:
      "Tango is a logic game from LinkedIn where you need to fill a grid so that each row and column contains the same number of suns (☀️) and moons (🌙). No more than 2 ☀️ or 🌙 may be next to each other, either vertically or horizontally.",
    playUrl: "https://www.linkedin.com/games/tango/",
    color: "yellow",
  },
  {
    slug: "wordsalad",
    name: "WordSalad",
    description:
      "Word Salad is a daily word puzzle game where players swipe through letter grids to uncover hidden words based on specific themes, such as fruits, gemstones, or European cities. As words are found, the letters disappear, creating new opportunities to form additional words.",
    playUrl: "https://www.wordsalad.app/",
    color: "indigo",
  },
  {
    slug: "chess-puzzles",
    name: "Chess.com Puzzles",
    description:
      "Chess.com daily puzzles are bite-sized challenges to improve tactical skills, featuring real-game positions and tasks like checkmate or material gain, suitable for all skill levels.",
    playUrl: "https://www.chess.com/puzzles",
    color: "gray",
  },
  {
    slug: "nytimes-sudoku",
    name: "NYTimes Sudoku",
    description:
      "The New York Times Sudoku offers daily puzzles in varying difficulty levels - easy, medium, and hard, challenging players to fill grids logically while sharpening problem-solving skills.",
    playUrl: "https://www.nytimes.com/puzzles/sudoku",
    color: "red",
  },
  {
    slug: "wordle",
    name: "NYTimes Wordle",
    description:
      "Wordle is a fun and simple word puzzle game where players have six chances to guess a five-letter word. After each guess, the letters change color to show how close you are to the correct word.",
    playUrl: "https://www.nytimes.com/games/wordle",
    color: "teal",
  },
];

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getAllGames(): Game[] {
  return games;
}
