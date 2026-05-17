"""
从 https://www.linkedinpinpointanswer.today/linkedin-crossclimb-answers 抓取当日 Crossclimb 答案。

Crossclimb 是文字梯游戏：从起始词每次改一个字母，逐步变换到目标词。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_crossclimb.py
"""

import json
import re
from dataclasses import dataclass
from datetime import date, timedelta

import json5
import requests
from icecream import ic

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-crossclimb-answers"

# Crossclimb #747 = 2026-05-17，每天一期
CROSSCLIMB_TODAY_NUMBER = 747
CROSSCLIMB_TODAY_DATE = date(2026, 5, 17)


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


def _get_today_crossclimb() -> TodayCrossclimb:
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    text = _fetch_rsc(TODAY_PAGE_URL)

    clues_match = re.search(r'"clues":(\[[^\]]+\])', text)
    ladder_match = re.search(r'"ladder":(\[[^\]]+\])', text)

    if not clues_match or not ladder_match:
        ic("Warning: Could not extract Crossclimb data from RSC response")
        raise ValueError("未能从页面中提取 Crossclimb 数据。请检查页面结构是否变化。")

    clues = json.loads(clues_match.group(1))
    ladder = json.loads(ladder_match.group(1))

    # 提取起始词和结束词
    start_word = ladder[0] if ladder else ""
    end_word = ladder[-1] if ladder else ""

    # 计算期号：从日期推算
    puzzle_number = CROSSCLIMB_TODAY_NUMBER  # today's number

    # 验证日期是否正确
    puzzle_date = CROSSCLIMB_TODAY_DATE

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


def update_crossclimb_ts(
    cc_data: TodayCrossclimb,
    ts_file_path: str = "./data/answers/crossclimb.ts",
):
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    prefix = """import { GameAnswer } from "@/types/game";

export const crossclimbAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到crossclimbAnswers数组定义")

    cc_seq = f"#{cc_data.puzzle_number}"
    if f'sequence: "{cc_seq}"' in ts_content:
        ic(f"Crossclimb #{cc_data.puzzle_number} already exists, skipping update")
        return False

    ladder_str = " → ".join(cc_data.ladder)
    clue_descriptions = [c["clue"] for c in cc_data.clues]
    today_str = cc_data.puzzle_date.strftime("%Y-%m-%d")

    clue_hint_html = (
        f'<p>Word ladder from <strong>{cc_data.start_word}</strong> to '
        f'<strong>{cc_data.end_word}</strong>:<br>\n'
        f'{ladder_str}</p>'
    )

    # Build new entry as text (matching existing file format)
    clues_json = json.dumps(clue_descriptions, ensure_ascii=False)
    new_entry_lines = [
        '  {',
        f'    sequence: "{cc_seq}",',
        f'    date: "{today_str}",',
        f'    answer: {json.dumps(ladder_str)},',
        f'    clues: {clues_json},',
        f'    clueHint: `{clue_hint_html}`,',
        '  },',
    ]
    new_entry_text = "\n".join(new_entry_lines) + "\n"

    # Insert after the opening "[" of the array
    arr_start = len(prefix)
    remaining = ts_content[arr_start:]
    bracket_match = re.search(r"\[\s*\n", remaining)
    if not bracket_match:
        raise ValueError("未找到数组起始位置")

    insert_pos = arr_start + bracket_match.end()
    new_content = ts_content[:insert_pos] + new_entry_text + ts_content[insert_pos:]

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    ic(f"Successfully updated {ts_file_path} with Crossclimb #{cc_data.puzzle_number}")
    return True


if __name__ == "__main__":
    try:
        data = _get_today_crossclimb()
        update_crossclimb_ts(data)
    except ValueError as e:
        ic(f"Error: {e}")
        raise
