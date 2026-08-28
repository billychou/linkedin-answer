#!/usr/bin/env python3
"""答案新鲜度哨兵：检查每款游戏今天是否都有新答案。

用法:
    python3 scripts/check_freshness.py

对 data/answers/ 下全部 7 款游戏取数据中的最新日期（UTC 今天为基准）：
  - 全部命中：打印 7/7 汇总，退出码 0
  - 任一缺失：打印缺失清单，退出码 1（供 CI 判定失败并告警）
"""

import re
import sys
from datetime import datetime, timezone
from pathlib import Path

GAMES = [
    "pinpoint",
    "queens",
    "patches",
    "zip",
    "tango",
    "mini-sudoku",
    "crossclimb",
]

ANSWERS_DIR = Path(__file__).resolve().parent.parent / "data" / "answers"


def latest_date(game: str) -> str | None:
    path = ANSWERS_DIR / f"{game}.ts"
    if not path.exists():
        return None
    dates = re.findall(r'date: "(\d{4}-\d{2}-\d{2})"', path.read_text(encoding="utf-8"))
    return max(dates) if dates else None


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    missing: list[tuple[str, str | None]] = []

    for game in GAMES:
        latest = latest_date(game)
        if latest == today:
            print(f"OK\t{game}\tlatest={latest}")
        else:
            print(f"STALE\t{game}\tlatest={latest or '(无数据)'}\texpected={today}")
            missing.append((game, latest))

    if missing:
        names = ", ".join(g for g, _ in missing)
        print(f"\n当日答案缺失 {len(missing)}/{len(GAMES)} 款游戏: {names}")
        return 1

    print(f"\n全部 {len(GAMES)}/{len(GAMES)} 款游戏均已有今日（{today}）答案。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
