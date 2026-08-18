"use client";

import { fetchSession } from "@/lib/authClient";
import { checkIn, type StreakSummary } from "@/lib/activityClient";
import { Flame } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 每日打卡：mount 时静默打卡一次（幂等），有连续天数时展示小火苗。
 * 放在 AnswerDisplay 内，覆盖全部游戏答案页。
 */
export default function DailyCheckIn() {
  const [streak, setStreak] = useState<StreakSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then(async (user) => {
      if (!user || cancelled) return;
      const result = await checkIn();
      if (!cancelled && result) setStreak(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streak || streak.current_streak <= 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning"
      title={`Best streak: ${streak.best_streak} days`}
    >
      <Flame className="h-3.5 w-3.5" />
      {streak.current_streak} day{streak.current_streak > 1 ? "s" : ""} streak
    </div>
  );
}
