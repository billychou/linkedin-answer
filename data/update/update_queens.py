"""
从 https://www.linkedinpinpointanswer.today/linkedin-queens-answers 抓取当日 Queens 答案。

2026-08 起源站改版：答案不再以图片提供，而是内嵌结构化 JSON
（"answer": {puzzle_no, puzzle_date, answer_alt, solution_grid...}）。
本脚本提取答案文本（形如 "R1C5, R2C8, ..."，即每行皇后的列位置）。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_queens.py              # 抓取当日数据并写入
       python3 data/update/update_queens.py --backfill   # 补齐数据文件中缺失的历史期数
"""

import argparse
import json
import os
import re
import sys

from icecream import ic

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_lib import generate_clue_hint, ts_clue_hint_field  # noqa: E402
from scrape_lib import (  # noqa: E402
    backfill_numbers,
    extract_json_object,
    fetch_rsc,
    insert_entries,
    sleep_between_backfill_fetches,
)

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-queens-answers"

TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const queensAnswers: GameAnswer[] = """


def _answer_text(answer_obj: dict) -> str:
    """从 answer 对象提取位置文本答案，如 "R1C5, R2C8, ..."。"""
    alt = answer_obj.get("answer_alt") or ""
    m = re.search(r"answer:\s*(.+)$", alt)
    if m and "R1C" in m.group(1):
        return m.group(1).strip()
    # 兜底：从 solution_grid.solution（皇后坐标）生成
    grid = answer_obj.get("solution_grid") or {}
    solution = grid.get("solution") or []
    if not solution:
        raise ValueError("answer 对象中未找到答案文本或 solution 坐标")
    positions = sorted(solution, key=lambda p: (p["row"], p["col"]))
    return ", ".join(f"R{p['row'] + 1}C{p['col'] + 1}" for p in positions)


def _clue_hint(number: int, puzzle_date: str, answer: str) -> str:
    fallback = (
        "<p>Place one queen in every row, column and colored region so no two "
        f"queens touch, even diagonally. Today's positions: <strong>{answer}</strong>.</p>"
    )
    return generate_clue_hint(
        (
            f"LinkedIn Queens puzzle #{number} ({puzzle_date}). Rules: place one "
            "queen per row, column and colored region; queens may not touch each "
            f"other, not even diagonally. Today's solution places queens at: {answer}. "
            "Explain a plausible solving path (e.g. forced cells from region/row "
            "constraints) for this specific puzzle."
        ),
        fallback,
    )


def _entry_text(number: int, puzzle_date: str, answer: str) -> str:
    lines = [
        "  {",
        f'    sequence: "#{number}",',
        f'    date: "{puzzle_date}",',
        f"    answer: {json.dumps(answer, ensure_ascii=False)},",
        ts_clue_hint_field(_clue_hint(number, puzzle_date, answer)),
        "  },",
    ]
    return "\n".join(lines) + "\n"


def _parse_answer_object(text: str) -> tuple[int, str, str]:
    """从 RSC 载荷提取 (期号, 日期, 答案文本)。"""
    obj = extract_json_object(text, "answer")
    if not obj or "puzzle_no" not in obj:
        raise ValueError("未能从页面中提取 Queens 答案数据。请检查页面结构是否变化。")
    number = int(obj["puzzle_no"])
    puzzle_date = obj.get("puzzle_date") or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", puzzle_date):
        raise ValueError(f"answer 对象中的日期异常: {puzzle_date!r}")
    return number, puzzle_date, _answer_text(obj)


def _get_today() -> tuple[int, str, str]:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    return _parse_answer_object(fetch_rsc(TODAY_PAGE_URL))


def update_queens_ts(
    entries: list[tuple[int, str, str]],
    ts_file_path: str = "./data/answers/queens.ts",
) -> int:
    wrapped = [(n, f"#{n}", _entry_text(n, d, a)) for n, d, a in entries]
    written = insert_entries(ts_file_path, TS_PREFIX, wrapped)
    if written:
        nums = ", ".join(f"#{n}" for n, _, _ in sorted(entries, reverse=True)[:written])
        ic(f"Successfully updated {ts_file_path} with {written} entries: {nums}")
    else:
        ic("所有期号均已存在，跳过更新")
    return written


def backfill(ts_file_path: str = "./data/answers/queens.ts"):
    """补齐数据文件中缺失的历史期数（扫描现有最老期号到当日之间的所有缺口）。"""
    today = _get_today()
    missing = backfill_numbers(ts_file_path, today[0])
    if not missing:
        ic("本地已完整，无需补抓")
        return

    ic(f"发现 {len(missing)} 期缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[tuple[int, str, str]] = []
    for num in missing:
        if num == today[0]:
            fetched.append(today)
            continue
        ic(f"Backfilling #{num} ...")
        try:
            text = fetch_rsc(f"{TODAY_PAGE_URL}/{num}")
            fetched.append(_parse_answer_object(text))
        except Exception as e:
            ic(f"#{num} 抓取/解析失败: {e}")
        sleep_between_backfill_fetches()

    written = update_queens_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Queens 答案数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史期数（从最老已有期号抓当日）",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        number, puzzle_date, answer = _get_today()
        ic(f"Queens #{number}, Date: {puzzle_date}, Answer: {answer}")
        written = update_queens_ts([(number, puzzle_date, answer)])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
