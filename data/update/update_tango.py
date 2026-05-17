"""
从 https://www.linkedinpinpointanswer.today/linkedin-tango-answers 抓取当日 Tango 答案图片。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_tango.py
"""

import json
import re
from dataclasses import dataclass
from datetime import date

import json5
import requests
from bs4 import BeautifulSoup
from icecream import ic

BASE_URL = "https://www.linkedinpinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-tango-answers"


@dataclass
class TodayTango:
    tango_number: int
    image_url: str


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


def _get_today_tango() -> TodayTango:
    ic(f"Fetching page: {TODAY_PAGE_URL}")
    html = _fetch_html(TODAY_PAGE_URL)
    soup = BeautifulSoup(html, "html.parser")

    image_url = _extract_image_url(soup)
    if not image_url:
        ic("Warning: Could not extract image URL")
        for img in soup.find_all("img")[:10]:
            ic(f"  img src: {img.get('src')}")
        for link in soup.find_all("link")[:10]:
            ic(f"  link href: {link.get('href')}")
        raise ValueError("未能从页面中提取 Tango 答案图片 URL。请检查页面结构是否变化。")

    m = re.search(r"tango-answer-(\d+)\.jpg", image_url, re.I)
    tango_number = int(m.group(1)) if m else 0

    ic(f"Tango number: {tango_number}, Image URL: {image_url}")
    return TodayTango(tango_number=tango_number, image_url=image_url)


def _extract_image_url(soup: BeautifulSoup) -> str | None:
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "tango-answer-" in src and ".jpg" in src:
            return src
    for link in soup.find_all("link"):
        href = link.get("href", "")
        if "tango-answer-" in href and ".jpg" in href:
            return href
    return None


def update_tango_ts(
    tango_data: TodayTango,
    ts_file_path: str = "./data/answers/tango.ts",
):
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    prefix = """import { GameAnswer } from "@/types/game";

export const tangoAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到tangoAnswers数组定义")
    arr_start = len(prefix)

    remaining_content = ts_content[arr_start:]
    array_match = re.search(r"\[\s*.*\s*\](?=\s*;?\s*$)", remaining_content, re.DOTALL)
    if not array_match:
        raise ValueError("未找到数组主体")

    array_str = array_match.group(0)
    array_match_end_in_full = arr_start + array_match.end()
    postfix = ts_content[array_match_end_in_full:]

    array_clean = re.sub(r",(\s*[\]\}])", r"\1", array_str)
    try:
        answers = json5.loads(array_clean)
    except Exception as e:
        raise ValueError(f"解析tangoAnswers时异常: {e}")

    tango_seq = f"#{tango_data.tango_number}"
    if any(entry.get("sequence") == tango_seq for entry in answers):
        ic(f"Tango #{tango_data.tango_number} already exists, skipping update")
        return False

    today_str = date.today().strftime("%Y-%m-%d")
    new_entry = {
        "sequence": tango_seq,
        "date": today_str,
        "answer": f"Tango #{tango_data.tango_number} - Solution grid",
        "image": tango_data.image_url,
    }
    answers.insert(0, new_entry)

    def js_entry_repr(entry):
        fields = [
            f'    sequence: "{entry["sequence"]}",',
            f'    date: "{entry["date"]}",',
            f"    answer: {json.dumps(entry['answer'])},",
        ]
        if entry.get("image"):
            fields.append(f"    image: {json.dumps(entry['image'])},")
        return "  {\n" + "\n".join(fields) + "\n  },"

    array_js = "[\n" + "\n".join(js_entry_repr(e) for e in answers) + "\n]"
    new_content = (prefix + array_js + postfix).encode("utf-8", "ignore").decode("utf-8")

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    ic(f"Successfully updated {ts_file_path} with Tango #{tango_data.tango_number}")
    return True


if __name__ == "__main__":
    try:
        data = _get_today_tango()
        update_tango_ts(data)
    except ValueError as e:
        ic(f"Error: {e}")
        raise
