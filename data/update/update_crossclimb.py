"""
从 https://www.linkedinpinpointanswer.today/linkedin-crossclimb-answers 抓取当日 Crossclimb 答案。

Crossclimb 是文字梯游戏：从起始词每次改一个字母，逐步变换到目标词。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_crossclimb.py              # 抓取当日数据并写入
       python3 data/update/update_crossclimb.py --backfill   # 补齐数据文件中缺失的历史期数
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
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-crossclimb-answers"

# 期号与日期的锚点（已人工核对）：#747 = 2026-05-17，每天一期。
# 注意：日期一律以页面元数据为准，锚点仅用于推算补抓范围。
ANCHOR_NUMBER = 747
ANCHOR_DATE = date(2026, 5, 17)

BACKFILL_DELAY = 0.3  # 补抓时每页间隔，避免对源站不友好


@dataclass
class TodayCrossclimb:
    puzzle_number: int
    start_word: str
    end_word: str
    ladder: list[str]
    clues: list[dict]  # each: {"clue": str, "answer": str}
    puzzle_date: date


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


def _parse_title_number_date(text: str) -> tuple[int, date]:
    """从 RSC 元数据解析期号与日期。

    兼容两种 og:title 格式:
      列表页:  "Crossclimb #849 Answer (Aug 27, 2026)"
      详情页:  "Crossclimb #849 Answer (Thursday, August 27, 2026)"
    """
    m = re.search(r"Crossclimb #(\d+) Answer \(([^)]+)\)", text)
    if not m:
        raise ValueError("未能从页面元数据中解析期号/日期，页面结构可能已变化。")
    number = int(m.group(1))
    raw_date = m.group(2).strip()
    for fmt in ("%b %d, %Y", "%A, %B %d, %Y"):
        try:
            return number, datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"未能解析日期: {raw_date!r}")


def _parse_clues_and_ladder(text: str) -> tuple[list[dict], list[str]]:
    clues_match = re.search(r'"clues":(\[[^\]]+\])', text)
    ladder_match = re.search(r'"ladder":(\[[^\]]+\])', text)

    if not clues_match or not ladder_match:
        raise ValueError("未能从页面中提取 Crossclimb 数据。请检查页面结构是否变化。")

    clues = json.loads(clues_match.group(1))
    ladder = json.loads(ladder_match.group(1))
    if not ladder:
        raise ValueError("页面中的 ladder 为空，拒绝写入。")
    return clues, ladder


def _get_today_crossclimb() -> TodayCrossclimb:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    text = _fetch_rsc(TODAY_PAGE_URL)
    puzzle_number, puzzle_date = _parse_title_number_date(text)
    clues, ladder = _parse_clues_and_ladder(text)

    start_word = ladder[0]
    end_word = ladder[-1]

    ic(f"Crossclimb #{puzzle_number}: {start_word} -> {end_word}, Date: {puzzle_date}")
    ic(f"Ladder: {' -> '.join(ladder)}")
    return TodayCrossclimb(
        puzzle_number=puzzle_number,
        start_word=start_word,
        end_word=end_word,
        ladder=ladder,
        clues=clues,
        puzzle_date=puzzle_date,
    )


def _fetch_detail_crossclimb(puzzle_number: int) -> TodayCrossclimb | None:
    """抓取指定期号的详情页；页面不存在时返回 None。"""
    url = f"{TODAY_PAGE_URL}/{puzzle_number}"
    try:
        text = _fetch_rsc(url)
    except requests.RequestException as e:
        ic(f"#{puzzle_number} 抓取失败: {e}")
        return None
    try:
        number, puzzle_date = _parse_title_number_date(text)
        clues, ladder = _parse_clues_and_ladder(text)
    except ValueError as e:
        ic(f"#{puzzle_number} 解析失败: {e}")
        return None
    return TodayCrossclimb(
        puzzle_number=number,
        start_word=ladder[0],
        end_word=ladder[-1],
        ladder=ladder,
        clues=clues,
        puzzle_date=puzzle_date,
    )


TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const crossclimbAnswers: GameAnswer[] = """


def _existing_sequences(ts_content: str) -> set[str]:
    return set(re.findall(r'sequence: "(#\d+)"', ts_content))


def _clue_hint(cc_data: TodayCrossclimb) -> str:
    ladder_str = " → ".join(cc_data.ladder)
    fallback = (
        f'<p>Word ladder from <strong>{cc_data.start_word}</strong> to '
        f'<strong>{cc_data.end_word}</strong>:<br>\n'
        f'{ladder_str}</p>'
    )
    clue_pairs = "; ".join(
        f'"{c["clue"]}" -> {c["answer"]}' for c in cc_data.clues if c.get("answer")
    )
    return generate_clue_hint(
        (
            f"LinkedIn Crossclimb puzzle #{cc_data.puzzle_number} "
            f"({cc_data.puzzle_date}). Rules: change exactly one letter at each "
            f"step to climb from the start word to the end word, every rung is a "
            f"valid word. Today's ladder: {ladder_str}. "
            + (f"Crossword clues: {clue_pairs}. " if clue_pairs else "")
            + "Explain a plausible way to discover this ladder step by step."
        ),
        fallback,
    )


def _entry_text(cc_data: TodayCrossclimb) -> str:
    ladder_str = " → ".join(cc_data.ladder)
    clue_descriptions = [c["clue"] for c in cc_data.clues]
    clues_json = json.dumps(clue_descriptions, ensure_ascii=False)
    lines = [
        '  {',
        f'    sequence: "#{cc_data.puzzle_number}",',
        f'    date: "{cc_data.puzzle_date.strftime("%Y-%m-%d")}",',
        f'    answer: {json.dumps(ladder_str)},',
        f'    clues: {clues_json},',
        ts_clue_hint_field(_clue_hint(cc_data)),
        '  },',
    ]
    return "\n".join(lines) + "\n"


def update_crossclimb_ts(
    entries: list[TodayCrossclimb],
    ts_file_path: str = "./data/answers/crossclimb.ts",
) -> int:
    """将新条目（按期号升序传入）插入数据文件头部，返回实际写入条数。"""
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    if not ts_content.startswith(TS_PREFIX):
        raise ValueError("未能在TypeScript文件中找到crossclimbAnswers数组定义")

    existing = _existing_sequences(ts_content)
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


def backfill(ts_file_path: str = "./data/answers/crossclimb.ts"):
    """补齐数据文件中缺失的历史期数（扫描现有最老期号到当日之间的所有缺口）。"""
    today_data = _get_today_crossclimb()
    existing = _existing_numbers(ts_file_path)
    if not existing:
        existing = {ANCHOR_NUMBER}
    start = min(existing)

    missing = [n for n in range(start, today_data.puzzle_number + 1) if n not in existing]
    if not missing:
        ic(f"本地已完整（覆盖 #{start}~#{today_data.puzzle_number}），无需补抓")
        return

    ic(f"发现 {len(missing)} 期缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[TodayCrossclimb] = []
    for num in missing:
        if num == today_data.puzzle_number:
            fetched.append(today_data)
            continue
        ic(f"Backfilling #{num} ...")
        entry = _fetch_detail_crossclimb(num)
        if entry:
            fetched.append(entry)
        time.sleep(BACKFILL_DELAY)

    written = update_crossclimb_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Crossclimb 答案数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史期数（从最新已有期号抓当日）",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        data = _get_today_crossclimb()
        written = update_crossclimb_ts([data])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
