/**
 * D1 数据访问层（每日活跃/streak，migration 0006）。
 *
 * 打卡模型：用户访问任意游戏答案页即记一次当日活跃（幂等）。
 * streak 计算为纯函数 computeStreaks，便于单测。
 */

import type { D1Database } from "./db";

export interface StreakInfo {
  /** 连续天数：今天已打卡从今天往回数，否则从昨天往回数（当天未打卡不断连）。 */
  current: number;
  best: number;
  totalDays: number;
}

/** YYYY-MM-DD 的上一天（按 UTC 日历计算，字符串语义）。 */
export function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** b 是否紧邻 a 的下一天。 */
export function isNextDay(a: string, b: string): boolean {
  return previousDay(b) === a;
}

/** 用户时区下的 YYYY-MM-DD。 */
export function localDateString(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * 纯函数：由打卡日期集合计算连续天数。
 * 规则：今天未打卡时从昨天往回数（当天没打卡不断连，过了今天才断）。
 */
export function computeStreaks(dates: string[], today: string): StreakInfo {
  const set = new Set(dates);
  const sorted = [...set].sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev && isNextDay(prev, date) ? run + 1 : 1;
    if (run > best) best = run;
    prev = date;
  }

  let current = 0;
  let cursor = set.has(today) ? today : previousDay(today);
  while (set.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  return { current, best, totalDays: set.size };
}

export async function getActivityDates(
  db: D1Database,
  userId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT date FROM user_activity WHERE user_id = ? ORDER BY date`)
    .bind(userId)
    .all<{ date: string }>();
  return results.map((row) => row.date);
}

/** 幂等打卡；返回是否本次新增。 */
export async function checkIn(
  db: D1Database,
  userId: string,
  date: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO user_activity (user_id, date, created_at)
       VALUES (?, ?, ?)`
    )
    .bind(userId, date, Date.now())
    .run();
  const meta = result as unknown as { meta?: { changes?: number } };
  return (meta.meta?.changes ?? 0) > 0;
}

export async function getUserStreak(
  db: D1Database,
  userId: string,
  timezone: string
): Promise<StreakInfo & { checkedInToday: boolean; today: string }> {
  const today = localDateString(timezone);
  const dates = await getActivityDates(db, userId);
  const streak = computeStreaks(dates, today);
  return { ...streak, checkedInToday: dates.includes(today), today };
}

export interface LeaderboardEntry {
  name: string;
  avatar_url: string;
  current: number;
  best: number;
}

/**
 * 排行榜：近 60 天内有打卡、且开启展示的用户，按当前连续天数取前 N。
 * （小规模站内存聚合；量级上来后可改 SQL 窗口函数或物化视图。）
 */
export async function getLeaderboard(
  db: D1Database,
  timezone: string,
  limit = 10
): Promise<LeaderboardEntry[]> {
  const today = localDateString(timezone);
  const windowStart = (() => {
    let cursor = today;
    for (let i = 0; i < 60; i++) cursor = previousDay(cursor);
    return cursor;
  })();

  const { results } = await db
    .prepare(
      `SELECT u.name AS name, u.avatar_url AS avatar_url, a.date AS date
       FROM user_activity a
       JOIN users u ON u.id = a.user_id
       WHERE a.date >= ?
         AND u.status = 'active'
         AND u.show_on_leaderboard = 1
       ORDER BY a.date`
    )
    .bind(windowStart)
    .all<{ name: string; avatar_url: string; date: string }>();

  const byUser = new Map<string, { name: string; avatar_url: string; dates: string[] }>();
  for (const row of results) {
    const key = `${row.name}|${row.avatar_url}`;
    const entry = byUser.get(key) ?? { name: row.name, avatar_url: row.avatar_url, dates: [] };
    entry.dates.push(row.date);
    byUser.set(key, entry);
  }

  const entries: LeaderboardEntry[] = [];
  for (const { name, avatar_url, dates } of byUser.values()) {
    const streak = computeStreaks(dates, today);
    if (streak.current > 0) {
      entries.push({ name: name || "Player", avatar_url, current: streak.current, best: streak.best });
    }
  }
  entries.sort((a, b) => b.current - a.current || b.best - a.best);
  return entries.slice(0, limit);
}
