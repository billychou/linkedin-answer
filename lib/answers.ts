import { pinpointAnswers } from "@/data/answers/pinpoint";
import { GameAnswer, GameSlug } from "@/types/game";

const answersMap: Record<GameSlug, GameAnswer[]> = {
  pinpoint: pinpointAnswers,
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
