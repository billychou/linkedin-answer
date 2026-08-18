/**
 * Streak 计算纯函数单测（留存功能的核心规则）。
 */

import { describe, expect, it } from "vitest";
import {
  computeStreaks,
  isNextDay,
  previousDay,
} from "../../functions/_lib/activity";

describe("previousDay / isNextDay", () => {
  it("跨月、跨年正确", () => {
    expect(previousDay("2026-08-18")).toBe("2026-08-17");
    expect(previousDay("2026-08-01")).toBe("2026-07-31");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
  });

  it("闰年 2 月", () => {
    expect(previousDay("2028-03-01")).toBe("2028-02-29");
  });

  it("isNextDay 判断相邻", () => {
    expect(isNextDay("2026-08-17", "2026-08-18")).toBe(true);
    expect(isNextDay("2026-07-31", "2026-08-01")).toBe(true);
    expect(isNextDay("2026-08-16", "2026-08-18")).toBe(false);
  });
});

describe("computeStreaks", () => {
  const TODAY = "2026-08-18";

  it("空历史 → 全 0", () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, best: 0, totalDays: 0 });
  });

  it("今天打卡 → current=1", () => {
    expect(computeStreaks([TODAY], TODAY)).toEqual({ current: 1, best: 1, totalDays: 1 });
  });

  it("连续三天含今天 → current=3", () => {
    const dates = ["2026-08-16", "2026-08-17", "2026-08-18"];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 3, best: 3, totalDays: 3 });
  });

  it("今天未打卡但昨天打了 → 不断连，从昨天往回数", () => {
    const dates = ["2026-08-16", "2026-08-17"];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 2, best: 2, totalDays: 2 });
  });

  it("昨天也没打卡 → 断连 current=0", () => {
    const dates = ["2026-08-15", "2026-08-16"];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 0, best: 2, totalDays: 2 });
  });

  it("best 取历史最长段", () => {
    const dates = [
      "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", // 4 连
      "2026-08-10", // 断
      "2026-08-17", "2026-08-18", // 2 连
    ];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 2, best: 4, totalDays: 7 });
  });

  it("重复日期去重", () => {
    const dates = [TODAY, TODAY, "2026-08-17"];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 2, best: 2, totalDays: 2 });
  });

  it("乱序输入不影响结果", () => {
    const dates = ["2026-08-18", "2026-08-16", "2026-08-17"];
    expect(computeStreaks(dates, TODAY)).toEqual({ current: 3, best: 3, totalDays: 3 });
  });
});
