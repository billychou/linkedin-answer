import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { getUserStreak } from "../../_lib/activity";

interface Context {
  request: Request;
  env: AuthEnv;
}

/** GET /api/activity/me — 当前用户的 streak 摘要。 */
export const onRequest = async (context: Context): Promise<Response> => {
  const { request, env } = context;
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }
  if (!env.DB) {
    return jsonResponse({ error: "DB binding is not configured" }, 500);
  }
  const auth = await getRequestUser(request, env);
  if (!auth) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const streak = await getUserStreak(env.DB, auth.user.id, auth.user.timezone);
  return jsonResponse({
    current_streak: streak.current,
    best_streak: streak.best,
    total_days: streak.totalDays,
    checked_in_today: streak.checkedInToday,
  });
};
