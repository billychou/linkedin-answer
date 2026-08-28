"""
从 https://www.linkedinpinpointanswer.today/linkedin-zip-answers 抓取当日 Zip 答案。

2026-08 起源站改版：答案图片已下线，页面内嵌结构化 JSON
（"answer": {puzzle_no, puzzle_date, answer_caption, solution_grid...}）。
本脚本提取答案描述文本（如 "Path from 1 through 8"，路径覆盖全部格子）。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_zip.py              # 抓取当日数据并写入
       python3 data/update/update_zip.py --backfill   # 补齐数据文件中缺失的历史期数
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
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-zip-answers"

TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const zipAnswers: GameAnswer[] = """


def _answer_text(answer_obj: dict) -> str:
    """从 answer_caption 提取答案描述，如 "Path from 1 through 8"。"""
    number = answer_obj.get("puzzle_no")
    caption = (answer_obj.get("answer_caption") or "").strip()
    m = re.search(rf"Zip\s*#?{number}\s*solution[:\s]*(.+?)\.?$", caption, re.I)
    if m and m.group(1).strip():
        text = m.group(1).strip()
        return text[0].upper() + text[1:]
    # 兜底：从路径数据推导（覆盖的格子数与途经的数字标记）
    grid = answer_obj.get("solution_grid") or {}
    cells = [c for row in (grid.get("grid") or []) for c in row]
    if not cells:
        raise ValueError("answer 对象中未找到描述文本或路径数据")
    numbers = sorted(c["number"] for c in cells if c.get("number") is not None)
    total = len(cells)
    if numbers:
        return f"Path from {numbers[0]} through {numbers[-1]} filling all {total} cells"
    return f"Path filling all {total} cells"


def _clue_hint(number: int, puzzle_date: str, answer: str) -> str:
    fallback = (
        "<p>Draw one continuous path that passes through every numbered dot in "
        "order and fills every cell without crossing itself. "
        f"Today's solution: <strong>{answer}</strong>.</p>"
    )
    return generate_clue_hint(
        (
            f"LinkedIn Zip puzzle #{number} ({puzzle_date}). Rules: draw a "
            "single path connecting the numbered dots in ascending order; the "
            "path must fill every cell of the grid and may not cross or branch. "
            f"Today's solution is described as: {answer}. Explain a plausible "
            "strategy for routing the path (dead ends first, forcing cells)."
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
        raise ValueError("未能从页面中提取 Zip 答案数据。请检查页面结构是否变化。")
    number = int(obj["puzzle_no"])
    puzzle_date = obj.get("puzzle_date") or ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", puzzle_date):
        raise ValueError(f"answer 对象中的日期异常: {puzzle_date!r}")
    return number, puzzle_date, _answer_text(obj)


def _get_today() -> tuple[int, str, str]:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    return _parse_answer_object(fetch_rsc(TODAY_PAGE_URL))


def update_zip_ts(
    entries: list[tuple[int, str, str]],
    ts_file_path: str = "./data/answers/zip.ts",
) -> int:
    wrapped = [(n, f"#{n}", _entry_text(n, d, a)) for n, d, a in entries]
    written = insert_entries(ts_file_path, TS_PREFIX, wrapped)
    if written:
        nums = ", ".join(f"#{n}" for n, _, _ in sorted(entries, reverse=True)[:written])
        ic(f"Successfully updated {ts_file_path} with {written} entries: {nums}")
    else:
        ic("所有期号均已存在，跳过更新")
    return written


def backfill(ts_file_path: str = "./data/answers/zip.ts"):
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

    written = update_zip_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Zip 答案数据")
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
        ic(f"Zip #{number}, Date: {puzzle_date}, Answer: {answer}")
        written = update_zip_ts([(number, puzzle_date, answer)])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
