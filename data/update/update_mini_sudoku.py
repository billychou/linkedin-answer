"""
从 https://www.linkedinpinpointanswer.today/linkedin-mini-sudoku-answer 抓取当日 Mini Sudoku 答案。

Mini Sudoku 是 6x6 数独：网格数字 1-6，每行/列/宫不重复。
站点以 RSC 载荷渲染 6x6 解题网格，本脚本提取 36 个格子数字作为答案。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_mini_sudoku.py              # 抓取当日数据并写入
       python3 data/update/update_mini_sudoku.py --backfill   # 补齐数据文件中缺失的历史期数
"""

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime

import requests
from icecream import ic

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ai_lib import generate_clue_hint, ts_clue_hint_field  # noqa: E402

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-mini-sudoku-answer"

GRID_SIZE = 6
BACKFILL_DELAY = 0.3  # 补抓时每页间隔，避免对源站不友好


@dataclass
class TodayMiniSudoku:
    puzzle_number: int
    puzzle_date: date
    grid: list[list[int]]  # GRID_SIZE x GRID_SIZE 解题网格


def _fetch_rsc(url: str) -> str:
    resp = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "RSC": "1",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.text


def _parse_grid(text: str) -> list[list[int]]:
    """从 RSC 载荷提取 6x6 网格。单元格形如 ["$","div","0-0",{...,"children":5}]。"""
    cells = re.findall(
        r'"(\d)-(\d)",\{"className":"[^"]*?","children":(\d+)\}', text
    )
    if len(cells) != GRID_SIZE * GRID_SIZE:
        raise ValueError(
            f"未能提取完整 {GRID_SIZE}x{GRID_SIZE} 网格（只找到 {len(cells)} 格），"
            "页面结构可能已变化。"
        )
    grid = [[0] * GRID_SIZE for _ in range(GRID_SIZE)]
    for r, c, v in cells:
        r_i, c_i, v_i = int(r), int(c), int(v)
        if not (0 <= r_i < GRID_SIZE and 0 <= c_i < GRID_SIZE and 1 <= v_i <= GRID_SIZE):
            raise ValueError(f"非法单元格 ({r},{c})={v}")
        grid[r_i][c_i] = v_i
    if any(0 in row for row in grid):
        raise ValueError("网格存在未填充的格子，拒绝写入。")
    return grid


def _parse_detail_meta(text: str) -> tuple[int, date]:
    """从详情页元数据解析期号与日期。

    og:title 形如: "LinkedIn Mini Sudoku #381 Answer (Thursday, August 27, 2026)"
    """
    m = re.search(r"Mini Sudoku #(\d+) Answer \(([^)]+)\)", text)
    if not m:
        raise ValueError("未能从详情页元数据解析期号/日期，页面结构可能已变化。")
    number = int(m.group(1))
    raw_date = m.group(2).strip()
    for fmt in ("%A, %B %d, %Y", "%b %d, %Y"):
        try:
            return number, datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"未能解析日期: {raw_date!r}")


def _get_today_mini_sudoku() -> TodayMiniSudoku:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    text = _fetch_rsc(TODAY_PAGE_URL)

    numbers = [int(n) for n in re.findall(r"Sudoku #(\d+)", text)]
    if not numbers:
        raise ValueError("未能在列表页中找到期号，页面结构可能已变化。")
    puzzle_number = max(numbers)

    grid = _parse_grid(text)

    # 日期以详情页元数据为准
    try:
        detail_text = _fetch_rsc(f"{TODAY_PAGE_URL}/{puzzle_number}")
        number_in_detail, puzzle_date = _parse_detail_meta(detail_text)
        if number_in_detail != puzzle_number:
            ic(f"Warning: 列表页期号 #{puzzle_number} 与详情页 #{number_in_detail} 不一致")
    except (requests.RequestException, ValueError) as e:
        ic(f"Warning: 详情页解析失败（{e}），使用今天日期")
        puzzle_date = datetime.utcnow().date()

    ic(f"Mini Sudoku #{puzzle_number}, Date: {puzzle_date}")
    ic(f"Grid: {grid}")
    return TodayMiniSudoku(
        puzzle_number=puzzle_number, puzzle_date=puzzle_date, grid=grid
    )


def _fetch_detail_mini_sudoku(puzzle_number: int) -> TodayMiniSudoku | None:
    """抓取指定期号的详情页；页面不存在或解析失败时返回 None。"""
    url = f"{TODAY_PAGE_URL}/{puzzle_number}"
    try:
        text = _fetch_rsc(url)
    except requests.RequestException as e:
        ic(f"#{puzzle_number} 抓取失败: {e}")
        return None
    try:
        number, puzzle_date = _parse_detail_meta(text)
        grid = _parse_grid(text)
    except ValueError as e:
        ic(f"#{puzzle_number} 解析失败: {e}")
        return None
    return TodayMiniSudoku(puzzle_number=number, puzzle_date=puzzle_date, grid=grid)


TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const miniSudokuAnswers: GameAnswer[] = """


def _clue_hint(entry: TodayMiniSudoku) -> str:
    top_row = ", ".join(str(v) for v in entry.grid[0])
    fallback = (
        "<p>Fill the 6×6 grid so every row, column and 2×3 box contains the "
        f"digits 1–6 exactly once. The completed top row is: {top_row}.</p>"
    )
    grid_text = " / ".join(
        " ".join(str(v) for v in row) for row in entry.grid
    )
    return generate_clue_hint(
        (
            f"LinkedIn Mini Sudoku #{entry.puzzle_number} "
            f"({entry.puzzle_date.strftime('%Y-%m-%d')}). Rules: fill the 6×6 "
            "grid so every row, column and 2×3 box contains 1–6 exactly once. "
            f"The solved grid row by row is: {grid_text}. Explain a plausible "
            "solving approach (single-candidate cells, row/column elimination) "
            "for this specific puzzle."
        ),
        fallback,
    )


def _entry_text(entry: TodayMiniSudoku) -> str:
    grid_js = json.dumps(entry.grid)
    lines = [
        "  {",
        f'    sequence: "#{entry.puzzle_number}",',
        f'    date: "{entry.puzzle_date.strftime("%Y-%m-%d")}",',
        f'    answer: "Mini Sudoku #{entry.puzzle_number} - Solution grid",',
        ts_clue_hint_field(_clue_hint(entry)),
        f"    grid: {grid_js},",
        "  },",
    ]
    return "\n".join(lines) + "\n"


def update_mini_sudoku_ts(
    entries: list[TodayMiniSudoku],
    ts_file_path: str = "./data/answers/mini-sudoku.ts",
) -> int:
    """将新条目（按期号升序传入）插入数据文件头部，返回实际写入条数。"""
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    if not ts_content.startswith(TS_PREFIX):
        raise ValueError("未能在TypeScript文件中找到miniSudokuAnswers数组定义")

    existing = set(re.findall(r'sequence: "(#\d+)"', ts_content))
    new_entries = [e for e in entries if f"#{e.puzzle_number}" not in existing]
    if not new_entries:
        ic("所有期号均已存在，跳过更新")
        return 0

    # 期号大的排在前面（日期降序）
    new_entries.sort(key=lambda e: e.puzzle_number, reverse=True)
    new_text = "".join(_entry_text(e) for e in new_entries)

    arr_start = len(TS_PREFIX)
    remaining = ts_content[arr_start:]
    bracket_match = re.search(r"\[\s*\n", remaining)
    if not bracket_match:
        raise ValueError("未找到数组起始位置")

    insert_pos = arr_start + bracket_match.end()
    new_content = ts_content[:insert_pos] + new_text + ts_content[insert_pos:]

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    nums = ", ".join(f"#{e.puzzle_number}" for e in new_entries)
    ic(f"Successfully updated {ts_file_path} with {len(new_entries)} entries: {nums}")
    return len(new_entries)


def _existing_numbers(ts_file_path: str) -> set[int]:
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()
    return {int(s.lstrip("#")) for s in re.findall(r'sequence: "(#\d+)"', ts_content)}


def backfill(ts_file_path: str = "./data/answers/mini-sudoku.ts"):
    """补齐数据文件中缺失的历史期数（扫描现有最老期号到当日之间的所有缺口）。"""
    today_data = _get_today_mini_sudoku()
    existing = _existing_numbers(ts_file_path)
    if not existing:
        ic("数据文件为空，无法确定补抓起点")
        return
    start = min(existing)

    missing = [n for n in range(start, today_data.puzzle_number + 1) if n not in existing]
    if not missing:
        ic(f"本地已完整（覆盖 #{start}~#{today_data.puzzle_number}），无需补抓")
        return

    ic(f"发现 {len(missing)} 期缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[TodayMiniSudoku] = []
    for num in missing:
        if num == today_data.puzzle_number:
            fetched.append(today_data)
            continue
        ic(f"Backfilling #{num} ...")
        entry = _fetch_detail_mini_sudoku(num)
        if entry:
            fetched.append(entry)
        time.sleep(BACKFILL_DELAY)

    written = update_mini_sudoku_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Mini Sudoku 答案数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史期数（从最新已有期号抓当日）",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        data = _get_today_mini_sudoku()
        written = update_mini_sudoku_ts([data])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
