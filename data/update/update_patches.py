"""
从 https://www.linkedinpinpointanswer.today/linkedin-patches-answer-today 抓取当日 Patches 答案图片。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. 运行脚本:
       python3 data/update/update_patches.py

    特性:
        - 自动抓取最新的 Patches 答案图片 URL
        - 自动更新 data/answers/patches.ts 文件
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
TODAY_PAGE_URL = f"{BASE_URL}/linkedin-patches-answer-today"


@dataclass
class TodayPatches:
    """当日 Patches 数据"""

    patches_number: int
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


def _get_today_patches() -> TodayPatches:
    """
    抓取当日 Patches 的答案图片。
    """
    ic(f"Fetching page: {TODAY_PAGE_URL}")
    html = _fetch_html(TODAY_PAGE_URL)
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator=" ", strip=True)

    # 提取答案图片 URL（先提取图片，再从中获取期号）
    image_url = _extract_image_url(soup, None)

    # 从图片 URL 中提取期号（更可靠）
    patches_number = _extract_patches_number(text, image_url)

    if not image_url:
        ic("Warning: Could not extract image URL")
        # 调试：打印所有 img/link 标签
        for img in soup.find_all("img")[:10]:
            ic(f"  img src: {img.get('src')}")
        for link in soup.find_all("link")[:10]:
            ic(f"  link href: {link.get('href')}")
        raise ValueError("未能从页面中提取 Patches 答案图片 URL。请检查页面结构是否变化。")

    ic(f"Image URL: {image_url}")

    return TodayPatches(
        patches_number=patches_number or 0,
        image_url=image_url,
    )


def _extract_patches_number(text: str, image_url: str | None = None) -> int | None:
    """从文本或图片 URL 中提取 Patches 期号"""
    # 优先从图片 URL 提取（更可靠）
    if image_url:
        m = re.search(r"patches-answer-(\d+)\.jpg", image_url, re.I)
        if m:
            return int(m.group(1))
    # 备用：从页面文本提取
    m = re.search(r"Patches?\s*#?(\d+)", text, re.I)
    return int(m.group(1)) if m else None


def _extract_image_url(soup: BeautifulSoup, patches_number: int | None) -> str | None:
    """从页面中提取当日 Patches 答案图片 URL"""

    # 方案1: 查找 main 区域的 img 标签（排除 preload link）
    # 通常页面中第一个 patches-answer-XX.jpg 图片就是当日答案
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if "patches-answer-" in src and ".jpg" in src:
            return src

    # 方案2: 从 <link rel="preload" as="image"> 中提取
    for link in soup.find_all("link"):
        href = link.get("href", "")
        if "patches-answer-" in href and ".jpg" in href:
            return href

    # 方案3: 根据期号构建 URL
    if patches_number:
        return f"https://pub-f7562dec8e4a49c993b8e62385d6e405.r2.dev/playpatchesonline/patches-answer-{patches_number}.jpg"

    return None


def update_patches_ts(
    patches: TodayPatches,
    ts_file_path: str = "./data/answers/patches.ts",
):
    """
    根据 get_today_patches 返回的结果，更新 patches.ts 答案列表。
    如果 patches_number 已存在，不更新。
    否则，将新结果插入为第一条。
    """

    # Step 1. 读取文件内容
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    ic(f"Read file: {ts_file_path}")

    # Step 2. 提取 patchesAnswers 数组的内容
    prefix = """import { GameAnswer } from "@/types/game";

export const patchesAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到patchesAnswers数组定义")
    arr_start = len(prefix)

    remaining_content = ts_content[arr_start:]
    array_match = re.search(r"\[\s*.*\s*\](?=\s*;?\s*$)", remaining_content, re.DOTALL)

    if not array_match:
        raise ValueError("未找到数组主体")

    array_str = array_match.group(0)
    array_match_end_in_full = arr_start + array_match.end()
    postfix = ts_content[array_match_end_in_full:]

    # Step 3. 解析数组
    array_clean = array_str
    array_clean = re.sub(r",(\s*[\]\}])", r"\1", array_clean)

    try:
        answers = json5.loads(array_clean)
    except Exception as e:
        raise ValueError(f"解析patchesAnswers时异常: {e}")

    # Step 4. 判断是否已存在
    patches_seq = f"#{patches.patches_number}"
    if any(entry.get("sequence") == patches_seq for entry in answers):
        ic(f"Patches #{patches.patches_number} already exists, skipping update")
        return False

    today_str = date.today().strftime("%Y-%m-%d")

    # Step 5. 新建 entry
    new_entry = {
        "sequence": patches_seq,
        "date": today_str,
        "answer": f"Patches #{patches.patches_number} - 5x5 grid solution",
        "image": patches.image_url,
    }

    # Step 6. 更新到最前面
    answers.insert(0, new_entry)

    # Step 7. 序列化为 JS 数组
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

    ic(f"Successfully updated {ts_file_path} with Patches #{patches.patches_number}")
    return True


if __name__ == "__main__":
    try:
        data = _get_today_patches()
        update_patches_ts(data)
    except ValueError as e:
        ic(f"Error: {e}")
        raise
