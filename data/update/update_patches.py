"""
从 https://www.linkedinpinpointanswer.today/linkedin-patches-answer-today 抓取当日 Patches 答案。

2026-08 起源站改版：页面内嵌结构化 JSON（"viewerData": {puzzleNo, imageSrc,
caption, board...}），答案图片托管在 R2 公共桶。
本脚本提取答案描述文本（如 "8 patches on a 6x6 grid"）与图片 URL。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_patches.py              # 抓取当日数据并写入
       python3 data/update/update_patches.py --backfill   # 补齐数据文件中缺失的历史期数
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
    parse_title_date,
    sleep_between_backfill_fetches,
)

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-patches-answer-today"

TS_PREFIX = """import { GameAnswer } from "@/types/game";

export const patchesAnswers: GameAnswer[] = """


def _answer_text(viewer_data: dict) -> str:
    """从 caption 提取答案描述，如 "8 patches on a 6x6 grid"。"""
    number = viewer_data.get("puzzleNo")
    caption = (viewer_data.get("caption") or "").strip()
    m = re.search(rf"Patches\s*#?{number}\s*solution[:\s]*(.+?)\.?$", caption, re.I)
    if m and m.group(1).strip():
        return m.group(1).strip()
    return f"Patches #{number} - Solution grid"


def _parse_viewer_data(text: str) -> tuple[int, str, str]:
    """从 RSC 载荷提取 (期号, 答案文本, 图片 URL)。"""
    vd = extract_json_object(text, "viewerData")
    if not vd or "puzzleNo" not in vd:
        raise ValueError("未能从页面中提取 Patches 答案数据。请检查页面结构是否变化。")
    number = int(vd["puzzleNo"])
    image_url = vd.get("imageSrc") or ""
    if not image_url.startswith("http"):
        raise ValueError(f"viewerData 中的图片 URL 异常: {image_url!r}")
    return number, _answer_text(vd), image_url


def _clue_hint(number: int, puzzle_date: str, answer: str) -> str:
    fallback = (
        "<p>Drag the scattered patches onto the board to rebuild the hidden "
        f"picture, matching edges and colors. Today's completed image: "
        f"<strong>{answer}</strong>.</p>"
    )
    return generate_clue_hint(
        (
            f"LinkedIn Patches puzzle #{number} ({puzzle_date}). Rules: place "
            "all the scattered pieces onto the board to reconstruct a complete "
            "picture; pieces fit together by matching their edges. The solved "
            f"puzzle is described as: {answer}. Give a short strategy tip for "
            "placing pieces efficiently (corners/edges first, color grouping)."
        ),
        fallback,
    )


def _entry_text(number: int, puzzle_date: str, answer: str, image_url: str) -> str:
    lines = [
        "  {",
        f'    sequence: "#{number}",',
        f'    date: "{puzzle_date}",',
        f"    answer: {json.dumps(answer, ensure_ascii=False)},",
        ts_clue_hint_field(_clue_hint(number, puzzle_date, answer)),
        f"    image: {json.dumps(image_url)},",
        "  },",
    ]
    return "\n".join(lines) + "\n"


def _get_today() -> tuple[int, str, str, str]:
    """返回 (期号, 日期, 答案文本, 图片 URL)。"""
    ic(f"Fetching RSC page: {TODAY_PAGE_URL}")
    text = fetch_rsc(TODAY_PAGE_URL)
    number, answer, image_url = _parse_viewer_data(text)
    _, puzzle_date = parse_title_date(text, r"LinkedIn Patches")
    return number, puzzle_date.strftime("%Y-%m-%d"), answer, image_url


def _fetch_detail(number: int) -> tuple[int, str, str, str] | None:
    """抓取指定期号的详情页；失败返回 None。"""
    url = f"{TODAY_PAGE_URL}/{number}"
    try:
        text = fetch_rsc(url)
        num, answer, image_url = _parse_viewer_data(text)
        _, puzzle_date = parse_title_date(text, r"LinkedIn Patches")
    except Exception as e:
        ic(f"#{number} 抓取/解析失败: {e}")
        return None
    return num, puzzle_date.strftime("%Y-%m-%d"), answer, image_url


def update_patches_ts(
    entries: list[tuple[int, str, str, str]],
    ts_file_path: str = "./data/answers/patches.ts",
) -> int:
    wrapped = [(n, f"#{n}", _entry_text(n, d, a, img)) for n, d, a, img in entries]
    written = insert_entries(ts_file_path, TS_PREFIX, wrapped)
    if written:
        nums = ", ".join(f"#{n}" for n, _, _, _ in sorted(entries, reverse=True)[:written])
        ic(f"Successfully updated {ts_file_path} with {written} entries: {nums}")
    else:
        ic("所有期号均已存在，跳过更新")
    return written


def backfill(ts_file_path: str = "./data/answers/patches.ts"):
    """补齐数据文件中缺失的历史期数（扫描现有最老期号到当日之间的所有缺口）。"""
    today = _get_today()
    missing = backfill_numbers(ts_file_path, today[0])
    if not missing:
        ic("本地已完整，无需补抓")
        return

    ic(f"发现 {len(missing)} 期缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[tuple[int, str, str, str]] = []
    for num in missing:
        if num == today[0]:
            fetched.append(today)
            continue
        ic(f"Backfilling #{num} ...")
        entry = _fetch_detail(num)
        if entry:
            fetched.append(entry)
        sleep_between_backfill_fetches()

    written = update_patches_ts(fetched, ts_file_path)
    ic(f"Backfill 完成：新写入 {written} 期")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 LinkedIn Patches 答案数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史期数（从最老已有期号抓当日）",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        number, puzzle_date, answer, image_url = _get_today()
        ic(f"Patches #{number}, Date: {puzzle_date}, Answer: {answer}")
        written = update_patches_ts([(number, puzzle_date, answer, image_url)])
        print(f"更新完成（写入 {written} 条）" if written else "无新增更新")
