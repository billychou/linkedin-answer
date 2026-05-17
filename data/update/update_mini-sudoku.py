"""
从 https://www.linkedinpinpointanswer.today/linkedin-mini-sudoku-answers 抓取当日 Mini Sudoku 答案图片。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_mini-sudoku.py
"""

import json
import re
from dataclasses import dataclass
from datetime import date, timedelta

import json5
import requests
from bs4 import BeautifulSoup
from icecream import ic

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-mini-sudoku-answers"

# Mini Sudoku 从 #1 开始（2025-08-12），每天一期
MINI_SUDOKU_START_NUMBER = 1
MINI_SUDOKU_START_DATE = date(2025, 8, 12)


@dataclass
class TodayMiniSudoku:
    mini_sudoku_number: int
    puzzle_date: date


def _fetch_html(url: str) -> str:
    resp = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.text


def _get_today_mini_sudoku() -> TodayMiniSudoku:
    ic(f"Fetching page: {TODAY_PAGE_URL}")
    html = _fetch_html(TODAY_PAGE_URL)
    soup = BeautifulSoup(html, "html.parser")

    image_url = _extract_image_url(soup)
    if not image_url:
        ic("Warning: Could not extract image URL")
        raise ValueError("未能从页面中提取 Mini Sudoku 答案图片 URL。请检查页面结构是否变化。")

    m = re.search(r"mini-sudoku-answer-(\d+)\.jpg", image_url, re.I)
    mini_sudoku_number = int(m.group(1)) if m else 0

    # 从期号计算日期
    puzzle_date = MINI_SUDOKU_START_DATE + timedelta(days=mini_sudoku_number - MINI_SUDOKU_START_NUMBER)

    ic(f"Mini Sudoku number: {mini_sudoku_number}, Date: {puzzle_date}")
    return TodayMiniSudoku(mini_sudoku_number=mini_sudoku_number, puzzle_date=puzzle_date)


def update_mini_sudoku_ts(
    mini_sudoku_data: TodayMiniSudoku,
    ts_file_path: str = "./data/answers/mini-sudoku.ts",
):
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    prefix = """import { GameAnswer } from "@/types/game";

export const miniSudokuAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到miniSudokuAnswers数组定义")

    mini_sudoku_seq = f"#{mini_sudoku_data.mini_sudoku_number}"
    if f'sequence: "{mini_sudoku_seq}"' in ts_content:
        ic(f"Mini Sudoku #{mini_sudoku_data.mini_sudoku_number} already exists, skipping update")
        return False

    today_str = mini_sudoku_data.puzzle_date.strftime("%Y-%m-%d")
    new_entry_text = (
        f'  {{\n'
        f'    sequence: "{mini_sudoku_seq}",\n'
        f'    date: "{today_str}",\n'
        f'    answer: "Mini Sudoku #{mini_sudoku_data.mini_sudoku_number} - Solution grid",\n'
        f'  }},\n'
    )

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

    ic(f"Successfully updated {ts_file_path} with Mini Sudoku #{mini_sudoku_data.mini_sudoku_number}")
    return True


if __name__ == "__main__":
    try:
        data = _get_today_mini_sudoku()
        update_mini_sudoku_ts(data)
    except ValueError as e:
        ic(f"Error: {e}")
        raise
