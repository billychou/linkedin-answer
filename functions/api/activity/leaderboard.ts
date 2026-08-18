import { getRequestUser, jsonResponse, type AuthEnv } from "../../_lib/auth";
import { getLeaderboard } from "../../_lib/activity";

interface Context {
  request: Request;
  env: AuthEnv;
}

/**
 * GET /api/activity/leaderboard — streak 排行榜（前 10）。
 * 需登录（保护展示者姓名）；仅展示 show_on_leaderboard=1 的用户。
 */
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
  const entries = await getLeaderboard(env.DB, auth.user.timezone, 10);
  return jsonResponse({ leaderboard: entries });
};
