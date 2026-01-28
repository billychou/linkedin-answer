export type GameSlug =
  | "pinpoint";
 
export type GameAnswer = {
  sequence: string;
  date: string; // YYYY-MM-DD format
  answer: string | string[]; // Can be a single answer or multiple answers
  clues?: string[]; // Optional clues (e.g., Pinpoint's 5 clues)
  clueHint?: string; // Optional hint text for clues (e.g., "Hover (desktop) or tap (mobile) each clue...")
  hints?: string[]; // Optional hints
  image?: string; // Optional image URL for the answer
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
