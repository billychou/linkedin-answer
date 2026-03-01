"""
从 https://pinpointanswer.today/#todays-answer 抓取当日 Pinpoint Clues 与 Answer。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5
    
    2. (可选) 配置 AI API 以生成智能提示:
       export DEEPSEEK_API_KEY="your-key"  # 推荐，更便宜
       或
       export OPENAI_API_KEY="your-key"
    
    3. 运行脚本:
       python3 data/update/update_pinpoint.py
    
    注意: 如果不设置 API key，脚本会使用简单的 fallback 模式生成提示。

特性:
    - 自动抓取最新的 Pinpoint 答案和线索
    - 使用 AI 生成有意义的 clueHint（解释每个线索与答案的关系）
    - 支持 DeepSeek 和 OpenAI API
    - 自动 fallback 到简单模式（无需 API key 也能工作）
    - 自动更新 data/answers/pinpoint.ts 文件
"""

import os
import re
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from icecream import ic

BASE_URL = "https://pinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/#todays-answer"


def _generate_clue_hint_with_ai(clues: list[str], answer: str) -> str:
    """
    使用 AI 生成更有意义的 clueHint。
    
    需要设置环境变量 OPENAI_API_KEY 或 DEEPSEEK_API_KEY。
    如果未设置，将回退到默认的简单 hint。
    """
    # 优先使用 DeepSeek API（更便宜）
    api_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        ic("Warning: No AI API key found, using fallback hint generation")
        return _generate_fallback_hint(clues)
    
    # 判断使用哪个 API
    if os.getenv("DEEPSEEK_API_KEY"):
        api_base = "https://api.deepseek.com/v1"
        model = "deepseek-chat"
    else:
        api_base = "https://api.openai.com/v1"
        model = "gpt-4o-mini"
    
    # 构建 prompt
    clues_text = "\n".join([f"{i+1}. {clue}" for i, clue in enumerate(clues)])
    prompt = f"""Given the following LinkedIn Pinpoint puzzle:

Answer: {answer}

Clues:
{clues_text}

Please explain how each clue relates to the answer. For each clue, provide a concise and insightful explanation (1-2 sentences) showing the connection.

Format your response as HTML with this structure:
<p>Here is how each clue relates to that word:<br>
<strong>Clue 1:</strong> Explanation for clue 1.<br>
<strong>Clue 2:</strong> Explanation for clue 2.<br>
...
</p>

Keep explanations clear, educational, and engaging. Focus on the specific connection between each clue and the answer."""

    try:
        response = requests.post(
            f"{api_base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that explains word puzzle connections clearly and concisely."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 1000,
            },
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        hint = result["choices"][0]["message"]["content"].strip()
        ic(f"Generated hint with AI: {hint[:100]}...")
        return hint
    except Exception as e:
        ic(f"Error generating hint with AI: {e}")
        return _generate_fallback_hint(clues)


def _generate_fallback_hint(clues: list[str]) -> str:
    """生成默认的简单 hint（当 AI 不可用时使用）"""
    clue_hint_lines = [
        f"<strong>{c}:</strong> {c} is one of the clues." for c in clues
    ]
    return (
        "<p>Here is how each clue relates to that word:<br>\n"
        + "<br>\n".join(clue_hint_lines)
        + "</p>"
    )



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
    # 使用更宽松的正则，允许 Category: 和 Pinpoint 之间有任意空白
    cat_match = re.search(
        r"Category:\s*Pinpoint\s*#?\d+\s*(.+?)(?=\s*📘|\s*📊|\s*Words\s*&|\s*Word\s*Phrase|\s*Meaning|\s*Usage|\s*🧠|$)",
        text,
        re.DOTALL | re.I,
    )
    if cat_match:
        answer = cat_match.group(1).strip()
        # 清理答案文本中可能的额外空格
        answer = re.sub(r'\s+', ' ', answer).strip()
        if answer:
            return answer

    # 备选1：尝试匹配 "Category: Pinpoint" 后面直到特殊字符或标点
    cat_match2 = re.search(
        r"Category:\s*Pinpoint\s*#?\d+\s*([^📘📊🧠]+?)(?=\s*(?:📘|📊|🧠|Words\s*&|Word\s*Phrase|Meaning|Usage|$))",
        text,
        re.DOTALL | re.I,
    )
    if cat_match2:
        answer = cat_match2.group(1).strip()
        answer = re.sub(r'\s+', ' ', answer).strip()
        if answer:
            return answer

    # 备选2：Full reveal came in—XXX—
    reveal_match = re.search(r"reveal\s+came\s+in[—\-]\s*(.+?)[—\-]", text, re.I)
    if reveal_match:
        return reveal_match.group(1).strip()

    # 备选3：尝试从页面标题或 meta 中提取
    title_tag = soup.find("title")
    if title_tag:
        title = title_tag.get_text()
        # 尝试匹配 "Pinpoint XXX Answer: YYY" 或类似格式
        title_match = re.search(r"Pinpoint\s*#?\d+.*?(?:Answer|is)[:\-]?\s*(.+?)(?:\||\-|$)", title, re.I)
        if title_match:
            return title_match.group(1).strip()

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

    ic(f"Fetching detail page: {detail_url}")
    detail_html = _fetch_html(detail_url)
    answer = _parse_answer(detail_html)
    if not answer:
        # 调试：打印部分 HTML 内容帮助诊断
        soup = BeautifulSoup(detail_html, "html.parser")
        text = soup.get_text(separator=" ", strip=True)
        ic(f"Page text sample (first 1000 chars): {text[:1000]}")
        # 查找 Category 位置
        cat_idx = text.find("Category")
        if cat_idx != -1:
            ic(f"Category context: {text[cat_idx:cat_idx+200]}")
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

    # Step 5. 使用 AI 生成 clueHint
    ic("Generating clue hint with AI...")
    clue_hint = _generate_clue_hint_with_ai(pinpoint.clues, pinpoint.answer)

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
