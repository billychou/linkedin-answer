export type GameSlug =
  | "pinpoint"
  | "crossclimb"
  | "zip"
  | "mini-sudoku"
  | "queens"
  | "tango"
  | "wordsalad"
  | "chess-puzzles"
  | "nytimes-sudoku"
  | "wordle";

export type GameAnswer = {
  date: string; // YYYY-MM-DD format
  answer: string | string[]; // Can be a single answer or multiple answers
  hints?: string[]; // Optional hints
};

export type Game = {
  slug: GameSlug;
  name: string;
  description: string;
  playUrl?: string;
  icon?: string;
  color?: string;
};

export type GameWithAnswers = Game & {
  answers: GameAnswer[];
};
