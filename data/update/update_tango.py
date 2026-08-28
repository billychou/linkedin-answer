"""
从 https://www.linkedinpinpointanswer.today/linkedin-tango-answers 抓取当日 Tango 答案。

2026-08 起源站改版：答案不再以图片提供，而是内嵌结构化 JSON
（"answer": {puzzle_no, puzzle_date, solution_grid...}），
solution_grid.grid 为完整 6x6 解题网格（value: sun/moon）。
本脚本把网格序列化为 ☀️/🌙 行文本作为答案。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_tango.py              # 抓取当日数据并写入
       python3 data/update/update_tango.py --backfill   # 补齐数据文件中缺失的历史期数
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
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-tango-answers"

TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const tangoAnswers: GameAnswer[] = """

SYMBOLS = {"sun": "☀️", "moon": "🌙"}


def _grid_rows(answer_obj: dict) -> list[str]:
    """把 solution_grid.grid 序列化为按行的 ☀️/🌙 字符串列表。"""
    grid = answer_obj.get("solution_grid") or {}
    rows_raw = grid.get("grid") or []
    if not rows_raw:
        raise ValueError("answer 对象中未找到 solution_grid.grid")
    rows: list[str] = []
    for row in rows_raw:
        chars = []
        for cell in sorted(row, key=lambda c: c.get("col", 0)):
            symbol = SYMBOLS.get(cell.get("value", ""))
            if not symbol:
                raise ValueError(f"非法单元格值: {cell.get('value')!r}")
            chars.append(symbol)
        rows.append("".join(chars))
    return rows


def _clue_hint(number: int, puzzle_date: str, rows: list[str]) -> str:
    first_row = rows[0] if rows else ""
    fallback = (
        "<p>Fill the 6×6 grid so every row and every column contains exactly "
        "three ☀️ and three 🌙, with no four identical symbols in a row. "
        f"The completed top row is: {first_row}.</p>"
    )
    grid_text = " / ".join(rows)
    return generate_clue_hint(
        (
            f"LinkedIn Tango puzzle #{number} ({puzzle_date}). Rules: fill the "
            "6×6 grid with suns and moons so each row and column has exactly "
            "three of each, and no more than three identical symbols sit "
            f"consecutively. The solved grid row by row is: {grid_text}. "
            "Explain a plausible way to reason it out (row/column counts, "
            "breaking runs) for this specific puzzle."
        ),
        fallback,
    )


def _entry_text(number: int, puzzle_date: str, rows: list[str]) -> str:
    rows_js = ", ".join(json.dumps(r, ensure_ascii=False) for r in rows)
    lines = [
        "  {",
        f'    sequence: "#{number}",',
        f'    date: "{puzzle_date}",',
        f"    answer: [{rows_js}],",
        ts_clue_hint_field(_clue_hint(number, puzzle_date, rows)),
        "  },",
    ]
    return "\n".join(lines) + "\n"


def _parse_answer_object(text: str) -> tuple[int, str, list[str]]:
    """从 RSC 载荷提取 (期号, 日期, 答案行列表)。"""
    obj = extract_json_object(text, "answer")
    if not obj or "puzzle_no" not in obj:
        raise ValueError("未能从页面中提取 Tango 答案数据。请检查页面结构是否变化。")
    number = int(obj["puzzle_no"])
    puzzle_date = obj.get("puzzle_date") or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", puzzle_date):
        raise ValueError(f"answer 对象中的日期异常: {puzzle_date!r}")
    return number, puzzle_date, _grid_rows(obj)


def _get_today() -> tuple[int, str, list[str]]:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    return _parse_answer_object(fetch_rsc(TODAY_PAGE_URL))


def update_tango_ts(
    entries: list[tuple[int, str, list[str]]],
    ts_file_path: str = "./data/answers/tango.ts",
) -> int:
    wrapped = [(n, f"#{n}", _entry_text(n, d, rows)) for n, d, rows in entries]
    written = insert_entries(ts_file_path, TS_PREFIX, wrapped)
    if written:
        nums = ", ".join(f"#{n}" for n, _, _ in sorted(entries, reverse=True)[:written])
        ic(f"Successfully updated {ts_file_path} with {written} entries: {nums}")
    else:
        ic("所有期号均已存在，跳过更新")
    return written


def backfill(ts_file_path: str = "./data/answers/tango.ts"):
    """补齐数据文件中缺失的历史期数（扫描现有最老期号到当日之间的所有缺口）。"""
    today = _get_today()
    missing = backfill_numbers(ts_file_path, today[0])
    if not missing:
        ic("本地已完整，无需补抓")
        return

    ic(f"发现 {len(missing)} 期缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[tuple[int, str, list[str]]] = []
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

    written = update_tango_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Tango 答案数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史期数（从最老已有期号抓当日）",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        number, puzzle_date, rows = _get_today()
        ic(f"Tango #{number}, Date: {puzzle_date}")
        ic(f"Grid: {rows}")
        written = update_tango_ts([(number, puzzle_date, rows)])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
