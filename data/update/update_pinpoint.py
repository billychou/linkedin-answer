"""
从 https://pinpointanswer.today/#todays-answer 抓取当日 Pinpoint Clues 与 Answer。
"""

import re
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from icecream import ic

BASE_URL = "https://pinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/#todays-answer"


@dataclass
class TodayPinpoint:
    """当日 Pinpoint 数据"""

    pinpoint_number: int
    clues: list[str]  # 5 个线索词
    answer: str
    detail_url: str


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


def _parse_clues_and_latest_link(html: str) -> tuple[list[str], str | None, int | None]:
    """从首页 HTML 解析 5 个 Clues 与最新一期的详情页链接、期号。"""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator=" ", strip=True)

    # 期号：Pinpoint 639 Clues 或 Today's LinkedIn Pinpoint #639
    num_match = re.search(r"Pinpoint\s*#?(\d+)\s+Clues", text, re.I) or re.search(
        r"#(\d+)\s+Answer", text
    )
    pinpoint_number = int(num_match.group(1)) if num_match else None

    # 5 个线索： #1 xxx #2 xxx ... #5 xxx
    clues_match = re.search(
        r"# 1\s*(.+?)\s*# 2\s*(.+?)\s*# 3\s*(.+?)\s*# 4\s*(.+?)\s*# 5\s*(.+?)(?=\s*(?:###|Answer|Pinpoint|$))",
        text,
        re.DOTALL | re.I,
    )
    if clues_match:
        clues = [c.strip() for c in clues_match.groups()]
    else:
        # 备选：按 #1..#5 逐段取下一段文本
        clues = []
        for i in range(1, 6):
            pat = re.compile(
                rf"#{i}\s*(.+?)(?=\s*#(?:{i + 1}|\d+)|$)", re.DOTALL | re.I
            )
            m = pat.search(text)
            clues.append(m.group(1).strip() if m else "")

    # 最新详情页链接：第一个指向 /linkedin-pinpoint-answer/pinpoint-数字/ 的链接
    detail_path = None
    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        m = re.search(r"linkedin-pinpoint-answer/pinpoint-(\d+)/?", href)
        if m:
            detail_path = (
                href if href.startswith("http") or href.startswith("/") else f"/{href}"
            )
            if pinpoint_number is None:
                pinpoint_number = int(m.group(1))
            break
    detail_url = urljoin(BASE_URL, detail_path) if detail_path else None

    return clues, detail_url, pinpoint_number


def _parse_answer(html: str) -> str | None:
    """从详情页 HTML 解析 Answer 文本。"""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    
    # 匹配 "Category: Pinpoint #XXX" 后的答案文本
    # 支持多种结束标记：📘 📊 (Words & How They Fit), Word Phrase, Meaning, Usage, 🧠 或字符串结束
    cat_match = re.search(
        r"Category:\s*Pinpoint\s*#?\d+\s*(.+?)(?=\s*📘|\s*📊|\s*Words\s*&|\s*Word\s*Phrase|\s*Meaning|\s*Usage|\s*🧠|$)",
        text,
        re.DOTALL | re.I,
    )
    if cat_match:
        answer = cat_match.group(1).strip()
        return answer

    # 备选：Full reveal came in—XXX—
    reveal_match = re.search(r"reveal\s+came\s+in[—\-]\s*(.+?)[—\-]", text, re.I)
    if reveal_match:
        return reveal_match.group(1).strip()

    return None


def get_today_pinpoint() -> TodayPinpoint:
    """
    抓取当日 Pinpoint 的 5 个 Clues 与 Answer。

    使用方式:
        from skills.pinpoint_skill import get_today_pinpoint
        data = get_today_pinpoint()
        print(data.clues)   # ['Mexico', 'Panama', ...]
        print(data.answer)  # "Places with \"City\" in their names!"
    """
    home_html = _fetch_html(TODAY_PAGE_URL)
    clues, detail_url, pinpoint_number = _parse_clues_and_latest_link(home_html)

    if not detail_url:
        raise ValueError("未在首页解析到当日详情页链接")

    detail_html = _fetch_html(detail_url)
    answer = _parse_answer(detail_html)
    if not answer:
        raise ValueError("未在详情页解析到 Answer 文本")

    return TodayPinpoint(
        pinpoint_number=pinpoint_number or 0,
        clues=clues[:5] if len(clues) >= 5 else clues,
        answer=answer,
        detail_url=detail_url,
    )


def update_pinpoint_ts(
    pinpoint: TodayPinpoint,
    ts_file_path: str = "/Users/songchuan.zhou/Src/linkedin-answer/data/answers/pinpoint.ts",
):
    """
    根据get_today_pinpoint返回的结果，更新pinpoint.ts答案列表。
    如果pinpoint_number已存在，不更新。
    否则，将新结果插入为第一条。
    文件为ts文件(json数组包裹在TS导出语法格式)，需json级别直接更新。
    """
    import json
    from datetime import date

    # Step 1. 读取文件内容
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    ic(ts_content)

    # Step 2. 提取pinpointAnswers数组的JS内容，去除前缀和末尾
    prefix = """import { GameAnswer } from "@/types/game";

export const pinpointAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到pinpointAnswers数组定义")
    arr_start = len(prefix)

    # 找到数组主体(匹配第一个 [ 和最后一个 ];
    import re

    # 注意 TypeScript 可能最后有 ; 或换行等
    # 从 arr_start 位置开始搜索，找到最后一个 ]; 作为数组结束
    remaining_content = ts_content[arr_start:]
    array_match = re.search(
        r"\[\s*.*\s*\](?=\s*;?\s*$)", remaining_content, re.DOTALL
    )
    ic(array_match)

    if not array_match:
        raise ValueError("未找到数组主体")

    array_str = array_match.group(0)
    ic(array_str)
    
    # 计算 array_match 在整个文件中的结束位置
    array_match_end_in_full = arr_start + array_match.end()
    postfix = ts_content[array_match_end_in_full:]
    ic(postfix)

    # Step 3. 将数组内容转为合法json（注意用json5或做预处理）
    # 用正则把单行/多行注释和最后多余的逗号移除， 把反引号替换成普通json字符串
    import json5

    array_clean = array_str
    # Replace backticks with double quotes for clueHint（多行；闭合反引号后可为逗号或 }，即允许是对象最后一个属性）
    array_clean = re.sub(
        r"clueHint:\s*`([^`]*)`\s*(?=\s*(?:,|\}))",
        lambda m: f"clueHint: {json.dumps(m.group(1))},",
        array_clean,
        flags=re.DOTALL,
    )
    # Replace single quotes with double quotes for answer
    array_clean = re.sub(
        r"answer:\s*'([^']*)'\s*,",
        lambda m: f"answer: {json.dumps(m.group(1))},",
        array_clean,
    )
    # Remove trailing commas in objects/arrays
    array_clean = re.sub(r",(\s*[\]\}])", r"\1", array_clean)
    # 由于部分字符串会内嵌换行和html，采用json5解析
    ic(array_clean)
    try:
        answers = json5.loads(array_clean)
    except Exception as e:
        raise ValueError(f"解析pinpointAnswers时异常: {e}")

    # Step 4. 判断是否已存在
    pinpoint_seq = f"#{pinpoint.pinpoint_number}"
    if any(entry.get("sequence") == pinpoint_seq for entry in answers):
        return False  # 已存在，不更新

    # Step 5. 生成clueHint
    clue_hint_lines = [
        f"<strong>{c}:</strong> {c} is one of the clues." for c in pinpoint.clues
    ]
    clue_hint = (
        "<p>Here is how each clue relates to that word:<br>\n"
        + "<br>\n".join(clue_hint_lines)
        + "</p>"
    )

    today_str = date.today().strftime("%Y-%m-%d")

    # Step 6. 新建entry
    new_entry = {
        "sequence": pinpoint_seq,
        "date": today_str,
        "answer": pinpoint.answer,
        "clues": pinpoint.clues,
        "clueHint": clue_hint,
    }

    # Step 7. 更新到最前面
    answers.insert(0, new_entry)

    # Step 8. 序列化成js数组块（美化缩进2空格，保留反引号用于 clueHint 字段，保持原格式风格）
    def js_entry_repr(entry):
        # answer用单引号，clueHint用反引号，其他标准json
        clues_str = ", ".join(f'"{c}"' for c in entry["clues"])
        return (
            "  {\n"
            f'    sequence: "{entry["sequence"]}",\n'
            f'    date: "{entry["date"]}",\n'
            f"    answer: {json.dumps(entry['answer'])},\n"
            f"    clues: [{clues_str}],\n"
            f"    clueHint: `{entry['clueHint']}`,\n"
            "  },"
        )

    # 重新生成列表js字符串
    array_js = "[\n" + "\n".join(js_entry_repr(entry) for entry in answers) + "\n]"

    # 保留原先的ts头部和末尾(如;等)
    # 使用相对于整个文件的结束位置，而不是相对于 remaining_content 的位置

    new_content = prefix + array_js + postfix

    # 清理 surrogate 字符，避免编码错误
    new_content = new_content.encode("utf-8", "ignore").decode("utf-8")

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True


if __name__ == "__main__":
    data = get_today_pinpoint()
    update_pinpoint_ts(data)
