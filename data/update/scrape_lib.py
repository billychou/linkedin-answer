"""抓取脚本共享工具：RSC 请求、JSON 对象提取、答案数据文件写入。

源站（linkedinpinpointanswer.today）为 Next.js RSC 渲染，页面载荷中内嵌
结构化 JSON（如 "answer":{...} / "viewerData":{...}）。这里提供从任意
文本中按键名提取首个合法 JSON 对象的能力（json.JSONDecoder.raw_decode），
以及按"日期降序"维护 data/answers/*.ts 的通用插入逻辑。
"""

import json
import re
import time
from datetime import date, datetime

import requests

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
)
BACKFILL_DELAY = 0.3  # 补抓时每页间隔，避免对源站不友好


def fetch_rsc(url: str) -> str:
    resp = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "RSC": "1"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.text


def extract_json_object(text: str, key: str) -> dict | None:
    """在文本中找到 `"key":{...}` 并解析出第一个合法 JSON 对象。"""
    i = text.find(f'"{key}":{{')
    if i < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[i + len(key) + 3 :])
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def parse_title_date(text: str, name_pattern: str) -> tuple[int | None, date]:
    """从页面 og:title（兜底 <title>）解析期号（可选）与日期。

    兼容标题变体:
      "LinkedIn Patches #163 Answer (Thursday, August 27, 2026)"
      "LinkedIn Patches Answer Today (Thursday, August 27, 2026)"
      "Crossclimb #849 Answer (Aug 27, 2026)"
    name_pattern 为不含期号的主题正则，如 "LinkedIn Patches"。
    找不到期号时返回 None（列表页标题可能没有期号）。
    """
    titles = re.findall(r'"og:title","content":"([^"]*)"', text)
    if not titles:
        m = re.search(r"<title>([^<]*)</title>", text)
        titles = [m.group(1)] if m else []

    for title in titles:
        m = re.search(rf"{name_pattern}\s*(?:#(\d+))?[^(]*\(([^)]+)\)", title)
        if not m:
            continue
        number = int(m.group(1)) if m.group(1) else None
        raw_date = m.group(2).strip()
        for fmt in ("%A, %B %d, %Y", "%b %d, %Y"):
            try:
                return number, datetime.strptime(raw_date, fmt).date()
            except ValueError:
                continue
    raise ValueError("未能从页面标题解析期号/日期，页面结构可能已变化。")


def existing_sequences(ts_file_path: str) -> set[str]:
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()
    return set(re.findall(r'sequence: "(#\d+)"', ts_content))


def insert_entries(
    ts_file_path: str,
    ts_prefix: str,
    entries: list[tuple[int, str, str]],
) -> int:
    """将新条目插入数据文件头部（日期降序），返回实际写入条数。

    entries: [(期号, "sequence 字符串", "完整条目文本(含缩进与结尾逗号换行)")]
    已存在的 sequence 自动跳过。
    """
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    if not ts_content.startswith(ts_prefix):
        raise ValueError(f"未能在 {ts_file_path} 中找到预期的数组定义")

    existing = existing_sequences(ts_file_path)
    new_entries = [e for e in entries if e[1] not in existing]
    if not new_entries:
        return 0

    new_entries.sort(key=lambda e: e[0], reverse=True)
    new_text = "".join(e[2] for e in new_entries)

    arr_start = len(ts_prefix)
    remaining = ts_content[arr_start:]
    bracket_match = re.search(r"\[\s*\n", remaining)
    if not bracket_match:
        raise ValueError("未找到数组起始位置")

    insert_pos = arr_start + bracket_match.end()
    new_content = ts_content[:insert_pos] + new_text + ts_content[insert_pos:]

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return len(new_entries)


def backfill_numbers(ts_file_path: str, today_number: int) -> list[int]:
    """返回 [最老已有期号, 今日期号] 区间内缺失的期号列表。"""
    existing = {int(s.lstrip("#")) for s in existing_sequences(ts_file_path)}
    if not existing:
        return []
    start = min(existing)
    return [n for n in range(start, today_number + 1) if n not in existing]


def sleep_between_backfill_fetches() -> None:
    time.sleep(BACKFILL_DELAY)
