import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { checkIn, getUserStreak, localDateString } from "../../_lib/activity";
import { rateLimitOr429 } from "../../_lib/rateLimit";

interface Context {
  request: Request;
  env: AuthEnv;
}

/** POST /api/activity/checkin — 幂等每日打卡（访问答案页时前端触发）。 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }

  const limited = await rateLimitOr429(env, request, "activity/checkin", 60, 3600);
  if (limited) return limited;

  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const today = localDateString(auth.user.timezone);
  await checkIn(env.DB, auth.user.id, today);
  const streak = await getUserStreak(env.DB, auth.user.id, auth.user.timezone);
  return jsonResponse({
    current_streak: streak.current,
    best_streak: streak.best,
    total_days: streak.totalDays,
    checked_in_today: streak.checkedInToday,
  });
};
