/**
 * 增长功能客户端封装（streak 打卡 / 排行榜）。
 */

export interface StreakSummary {
  current_streak: number;
  best_streak: number;
  total_days: number;
  checked_in_today: boolean;
}

export interface LeaderboardEntry {
  name: string;
  avatar_url: string;
  current: number;
  best: number;
}

/** 幂等打卡；失败静默（不打断用户看答案）。 */
export async function checkIn(): Promise<StreakSummary | null> {
  try {
    const res = await fetch("/api/activity/checkin", { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as StreakSummary;
  } catch {
    return null;
  }
}

export async function fetchMyStreak(): Promise<StreakSummary | null> {
  try {
    const res = await fetch("/api/activity/me");
    if (!res.ok) return null;
    return (await res.json()) as StreakSummary;
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch("/api/activity/leaderboard");
    if (!res.ok) return null;
    const data = (await res.json()) as { leaderboard: LeaderboardEntry[] };
    return data.leaderboard;
  } catch {
    return null;
  }
}
