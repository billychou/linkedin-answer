import { GameAnswer, GameSlug } from "@/types/game";
import { pinpointAnswers } from "@/data/answers/pinpoint";
import { crossclimbAnswers } from "@/data/answers/crossclimb";
import { zipAnswers } from "@/data/answers/zip";
import { miniSudokuAnswers } from "@/data/answers/mini-sudoku";
import { queensAnswers } from "@/data/answers/queens";
import { tangoAnswers } from "@/data/answers/tango";
import { wordsaladAnswers } from "@/data/answers/wordsalad";
import { chessPuzzlesAnswers } from "@/data/answers/chess-puzzles";
import { nytimesSudokuAnswers } from "@/data/answers/nytimes-sudoku";
import { wordleAnswers } from "@/data/answers/wordle";

const answersMap: Record<GameSlug, GameAnswer[]> = {
  pinpoint: pinpointAnswers,
  crossclimb: crossclimbAnswers,
  zip: zipAnswers,
  "mini-sudoku": miniSudokuAnswers,
  queens: queensAnswers,
  tango: tangoAnswers,
  wordsalad: wordsaladAnswers,
  "chess-puzzles": chessPuzzlesAnswers,
  "nytimes-sudoku": nytimesSudokuAnswers,
  wordle: wordleAnswers,
};

export function getAnswersByGameSlug(slug: GameSlug): GameAnswer[] {
  return answersMap[slug] || [];
}

export function getTodayAnswer(slug: GameSlug): GameAnswer | undefined {
  const answers = getAnswersByGameSlug(slug);
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Find today's answer, or return the most recent one
  const todayAnswer = answers.find((answer) => answer.date === today);
  if (todayAnswer) {
    return todayAnswer;
  }

  // If no answer for today, return the most recent answer
  return answers.length > 0 ? answers[0] : undefined;
}

export function getAnswerByDate(
  slug: GameSlug,
  date: string
): GameAnswer | undefined {
  const answers = getAnswersByGameSlug(slug);
  return answers.find((answer) => answer.date === date);
}

export function getAllAnswers(slug: GameSlug): GameAnswer[] {
  return getAnswersByGameSlug(slug).sort((a, b) => {
    // Sort by date descending (most recent first)
    return b.date.localeCompare(a.date);
  });
}
