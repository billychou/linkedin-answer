"""
从 https://www.linkedinpinpointanswer.today/linkedin-zip-answers 抓取当日 Zip 答案图片。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_zip.py

    特性:
        - 自动抓取最新的 Zip 答案图片 URL
        - 自动更新 data/answers/zip.ts 文件
        - 严格的验证，拒绝无效数据
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
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-zip-answers"


@dataclass
class TodayZip:
    """当日 Zip 数据"""

    zip_number: int
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


def _get_today_zip() -> TodayZip:
    """
    抓取当日 Zip 的答案图片。
    """
    ic(f"Fetching page: {TODAY_PAGE_URL}")
    html = _fetch_html(TODAY_PAGE_URL)
    soup = BeautifulSoup(html, "html.parser")

    # 提取答案图片 URL
    image_url = _extract_image_url(soup)

    if not image_url:
        ic("Warning: Could not extract image URL")
        for img in soup.find_all("img")[:10]:
            ic(f"  img src: {img.get('src')}")
        for link in soup.find_all("link")[:10]:
            ic(f"  link href: {link.get('href')}")
        raise ValueError("未能从页面中提取 Zip 答案图片 URL。请检查页面结构是否变化。")

    # 从图片 URL 中提取期号
    m = re.search(r"zip-answer-(\d+)\.jpg", image_url, re.I)
    zip_number = int(m.group(1)) if m else 0

    ic(f"Zip number: {zip_number}, Image URL: {image_url}")

    return TodayZip(
        zip_number=zip_number,
        image_url=image_url,
    )


def _extract_image_url(soup: BeautifulSoup) -> str | None:
    """从页面中提取当日 Zip 答案图片 URL"""
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "zip-answer-" in src and ".jpg" in src:
            return src
    for link in soup.find_all("link"):
        href = link.get("href", "")
        if "zip-answer-" in href and ".jpg" in href:
            return href
    return None


def update_zip_ts(
    zip_data: TodayZip,
    ts_file_path: str = "./data/answers/zip.ts",
):
    """
    根据 get_today_zip 返回的结果，更新 zip.ts 答案列表。
    如果 zip_number 已存在，不更新。
    否则，将新结果插入为第一条。
    """

    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    ic(f"Read file: {ts_file_path}")

    prefix = """import { GameAnswer } from "@/types/game";

export const zipAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到zipAnswers数组定义")
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
        raise ValueError(f"解析zipAnswers时异常: {e}")

    zip_seq = f"#{zip_data.zip_number}"
    if any(entry.get("sequence") == zip_seq for entry in answers):
        ic(f"Zip #{zip_data.zip_number} already exists, skipping update")
        return False

    today_str = date.today().strftime("%Y-%m-%d")

    new_entry = {
        "sequence": zip_seq,
        "date": today_str,
        "answer": f"Zip #{zip_data.zip_number} - Path solution",
        "image": zip_data.image_url,
    }

    answers.insert(0, new_entry)

    def js_entry_repr(entry):
        fields = []
        fields.append(f'    sequence: "{entry["sequence"]}",')
        fields.append(f'    date: "{entry["date"]}",')
        fields.append(f"    answer: {json.dumps(entry['answer'])},")
        if entry.get("image"):
            fields.append(f"    image: {json.dumps(entry['image'])},")
        return "  {\n" + "\n".join(fields) + "\n  },"

    array_js = "[\n" + "\n".join(js_entry_repr(entry) for entry in answers) + "\n]"

    new_content = prefix + array_js + postfix
    new_content = new_content.encode("utf-8", "ignore").decode("utf-8")

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    ic(f"Successfully updated {ts_file_path} with Zip #{zip_data.zip_number}")
    return True


if __name__ == "__main__":
    try:
        data = _get_today_zip()
        update_zip_ts(data)
    except ValueError as e:
        ic(f"Error: {e}")
        raise
