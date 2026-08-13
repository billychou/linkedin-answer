"""
从 https://pinpointanswer.today/#todays-answer 抓取当日 Pinpoint Clues 与 Answer。

使用方法:
    1. 安装依赖:
       pip3 install --break-system-packages requests beautifulsoup4 icecream json5

    2. (可选) 配置 AI API 以生成智能提示:
       export DASHSCOPE_API_KEY="your-key"  # 阿里云 DashScope API Key

    3. 运行脚本:
       python3 data/update/update_pinpoint.py            # 抓取并写入 data/answers/pinpoint.ts
       python3 data/update/update_pinpoint.py --dry-run  # 只抓取解析并打印，不写文件、不调用 AI

    注意: 如果不设置 API key，脚本会使用简单的 fallback 模式生成提示。

特性:
    - 自动抓取最新的 Pinpoint 答案和线索
    - 答案优先使用 DOM 结构化提取（详情页 "Category: Pinpoint #N" 标题后的首个 <p>），
      避免把答案后面的解说段落一起抓进来导致 answer 偏长/不准确
    - 提取结果做清洗（压缩空白、去掉首尾标点与 emoji）并校验长度，异常时直接报错而不是写入脏数据
    - 使用 AI 生成简洁的 clueHint（解释每个线索与答案的关系），无 API key 时自动 fallback
    - 自动更新 data/answers/pinpoint.ts 文件
"""

import argparse
import json
import os
import re
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from icecream import ic

BASE_URL = "https://pinpointanswer.today"
TODAY_PAGE_URL = f"{BASE_URL}/#todays-answer"

# 历史数据中最长的合法答案约 110 字符；超过该阈值基本可以判定混入了解说文本
MAX_ANSWER_LEN = 140

# 详情页标题形如: <h3>🏁 Category: Pinpoint 835</h3> / <h3>✅ Category: Pinpoint 817</h3>
_CATEGORY_HEADING_RE = re.compile(r"Category\s*:?\s*Pinpoint\s*#?\d+", re.I)

# 答案首尾可能出现的 emoji 区间（保留答案中间的 emoji，如 "Ladybirds (🐞)"）
_EDGE_EMOJI_RE = re.compile(
    r"^[\U0001F000-\U0001FAFF\u2190-\u21FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\s]+"
    r"|[\U0001F000-\U0001FAFF\u2190-\u21FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\s]+$"
)


def _clean_answer(raw: str) -> str:
    """规整提取到的答案文本: 压缩空白、去掉首尾的标点与 emoji。"""
    if not raw:
        return ""
    text = re.sub(r"\s+", " ", raw).strip()
    text = _EDGE_EMOJI_RE.sub("", text)
    text = text.strip(" \t-–—:：|•·")
    return text.strip()


def _generate_clue_hint_with_ai(clues: list[str], answer: str) -> str:
    """
    使用 AI 生成更有意义的 clueHint。

    需要设置环境变量 DASHSCOPE_API_KEY。
    如果未设置，将回退到默认的简单 hint。
    """
    api_key = os.getenv("DASHSCOPE_API_KEY")

    # Fallback: try sourcing .bash_profile if env var is not set
    # (needed when running from cron sessions that don't inherit shell env)
    if not api_key:
        try:
            bash_profile = os.path.expanduser("~/.bash_profile")
            with open(bash_profile, "r") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("export DASHSCOPE_API_KEY=") and not line.startswith("#"):
                        # Extract value, removing quotes if present
                        value = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if value:
                            api_key = value
                            ic("Loaded DASHSCOPE_API_KEY from ~/.bash_profile")
                            break
        except Exception as e:
            ic(f"Failed to read ~/.bash_profile: {e}")

    if not api_key:
        ic("Warning: No DASHSCOPE_API_KEY found, using fallback hint generation")
        return _generate_fallback_hint(clues, answer)

    # DashScope API 配置
    api_base = "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
    model = "qwen3.6-flash"

    clues_text = "\n".join([f"{i+1}. {clue}" for i, clue in enumerate(clues)])
    clue_lines = "\n".join(
        [f"<strong>{clue}:</strong> ..." for clue in clues]
    )
    prompt = f"""LinkedIn Pinpoint puzzle:

Answer: {answer}

Clues:
{clues_text}

For each clue, write ONE short sentence (at most 15 words) explaining how it connects to the answer.

Rules:
- Output ONLY the HTML block below. No markdown fences, no preamble, no extra commentary.
- Refer to the answer briefly; never repeat the full answer text in every line.
- Use exactly this structure:

<p>Here is how each clue relates to that word:<br>
{clue_lines}</p>"""

    try:
        ic(f"Calling DashScope API ({model}) to generate clue hint...")
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
                "temperature": 0.5,
                "max_tokens": 600,
            },
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        hint = result["choices"][0]["message"]["content"].strip()
        # 去掉模型可能包裹的 markdown 代码块
        hint = re.sub(r"^```(?:html)?\s*", "", hint)
        hint = re.sub(r"\s*```$", "", hint).strip()
        if "<strong" not in hint:
            ic(f"AI hint missing expected structure, falling back: {hint[:100]}")
            return _generate_fallback_hint(clues, answer)
        ic(f"Generated hint with AI ({len(hint)} chars)")
        return hint
    except Exception as e:
        ic(f"Error generating hint with AI: {e}")
        return _generate_fallback_hint(clues, answer)


def _generate_fallback_hint(clues: list[str], answer: str = "") -> str:
    """生成默认的简单 hint（当 AI 不可用时使用）"""
    clue_hint_lines = []
    for c in clues:
        if answer and len(answer) > 2:
            clue_hint_lines.append(f"<strong>{c}:</strong> {c} relates to the answer \"{answer}\".")
        else:
            clue_hint_lines.append(f"<strong>{c}:</strong> {c} is one of the clues.")

    return (
        "<p>Here is how each clue relates to that word:<br>\n"
        + "<br>\n".join(clue_hint_lines)
        + "</p>"
    )


def _sanitize_for_template_literal(text: str) -> str:
    """clueHint 会写入 TS 模板字符串(`...`)，转义反斜杠/反引号/${ 以免破坏语法。"""
    return text.replace("\\", "\\\\").replace("`", "'").replace("${", "\\${")


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
    """
    从详情页 HTML 解析 Answer 文本。

    优先使用 DOM 结构化提取:
      - 当前格式: <h3>🏁/✅ Category: Pinpoint #N</h3> 后的第一个 <p>，
        答案位于其中的 <strong> 内，<p> 的其余文本/后续段落是解说，不能要。
      - 旧格式:   <strong>Category: Words that come after "mega"</strong>，答案与
        "Category:" 前缀在同一个元素内。
    DOM 提取失败时再退回到全文正则（收紧了截断标记）。
    """
    soup = BeautifulSoup(html, "html.parser")

    # 方案1（当前格式）: Category 标题后的首个段落，优先取 <strong>/<b>
    for heading in soup.find_all(["h1", "h2", "h3", "h4"]):
        if not _CATEGORY_HEADING_RE.search(heading.get_text(" ", strip=True)):
            continue
        para = heading.find_next("p")
        if not para:
            continue
        strong = para.find(["strong", "b"])
        candidate = _clean_answer((strong or para).get_text(" ", strip=True))
        if candidate:
            return candidate

    # 方案2（旧格式）: 元素文本本身以 "Category:" 开头
    for strong in soup.find_all(["strong", "b"]):
        m = re.match(r"Category\s*:\s*(.+)$", strong.get_text(" ", strip=True), re.I)
        if m:
            candidate = _clean_answer(m.group(1))
            if candidate:
                return candidate

    # 方案3（兜底）: 全文正则，扩充截断标记，避免吞入后续解说段落
    text = soup.get_text(separator=" ", strip=True)
    cat_match = re.search(
        r"Category\s*:\s*(?:Pinpoint\s*#?\d+\s*)?(.+?)"
        r"(?=\s*(?:🏁|✅|🧩|📘|📊|🎯|📌|💡|❓|🔗|Words\s*&|Word\s*Phrase|"
        r"Meaning\s*&|Usage|Pro\s*Tips|Recent\s*Pinpoint|Archive|Toggle\s*theme|$))",
        text,
        re.DOTALL | re.I,
    )
    if cat_match:
        candidate = _clean_answer(cat_match.group(1))
        if candidate:
            return candidate

    # 方案4: 从页面标题中提取（LinkedIn Pinpoint NNN : <answer>）
    title_tag = soup.find("title")
    if title_tag:
        title = title_tag.get_text()
        title_match = re.search(
            r"Pinpoint\s*#?\d+\s*:\s*(.+?)(?:\s*Answer|\s*\||\s*\-|$)", title, re.I
        )
        if title_match:
            candidate = _clean_answer(title_match.group(1))
            if candidate and not re.search(r"linkedin|pinpoint|today", candidate, re.I):
                return candidate

    return None


def get_today_pinpoint() -> TodayPinpoint:
    """
    抓取当日 Pinpoint 的 5 个 Clues 与 Answer。

    使用方式:
        from update_pinpoint import get_today_pinpoint
        data = get_today_pinpoint()
        print(data.clues)   # ['Mexico', 'Panama', ...]
        print(data.answer)  # 'Places with "City" in their names!'
    """
    home_html = _fetch_html(TODAY_PAGE_URL)
    clues, detail_url, pinpoint_number = _parse_clues_and_latest_link(home_html)

    if not detail_url:
        raise ValueError("未在首页解析到当日详情页链接")

    ic(f"Fetching detail page: {detail_url}")
    detail_html = _fetch_html(detail_url)
    answer = _parse_answer(detail_html)

    if not answer or len(answer) > MAX_ANSWER_LEN:
        # 调试：打印页面文本关键位置，帮助诊断页面结构变化
        soup = BeautifulSoup(detail_html, "html.parser")
        text = soup.get_text(separator=" ", strip=True)
        ic(f"Page text sample (first 1500 chars): {text[:1500]}")
        cat_idx = text.find("Category")
        if cat_idx != -1:
            ic(f"Category context: {text[cat_idx:cat_idx + 300]}")
        if not answer:
            raise ValueError("未在详情页解析到 Answer 文本")
        raise ValueError(
            f"解析到的 Answer 异常偏长({len(answer)} chars)，疑似混入解说文本，拒绝写入: {answer[:200]!r}"
        )

    return TodayPinpoint(
        pinpoint_number=pinpoint_number or 0,
        clues=clues[:5] if len(clues) >= 5 else clues,
        answer=answer,
        detail_url=detail_url,
    )


def update_pinpoint_ts(
    pinpoint: TodayPinpoint,
    ts_file_path: str = "./data/answers/pinpoint.ts",
):
    """
    根据get_today_pinpoint返回的结果，更新pinpoint.ts答案列表。
    如果pinpoint_number已存在，不更新。
    否则，将新结果插入为第一条。
    文件为ts文件(json数组包裹在TS导出语法格式)，需json级别直接更新。
    """
    from datetime import date

    # Step 1. 读取文件内容
    with open(ts_file_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    # Step 2. 提取pinpointAnswers数组的JS内容，去除前缀和末尾
    prefix = """import { GameAnswer } from "@/types/game";

export const pinpointAnswers: GameAnswer[] = """
    if not ts_content.startswith(prefix):
        raise ValueError("未能在TypeScript文件中找到pinpointAnswers数组定义")
    arr_start = len(prefix)

    # 从 arr_start 位置开始搜索，找到最后一个 ]; 作为数组结束
    remaining_content = ts_content[arr_start:]
    array_match = re.search(
        r"\[\s*.*\s*\](?=\s*;?\s*$)", remaining_content, re.DOTALL
    )
    if not array_match:
        raise ValueError("未找到数组主体")

    array_str = array_match.group(0)

    # 计算 array_match 在整个文件中的结束位置
    array_match_end_in_full = arr_start + array_match.end()
    postfix = ts_content[array_match_end_in_full:]

    # Step 3. 将数组内容转为合法json（注意用json5或做预处理）
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
    try:
        answers = json5.loads(array_clean)
    except Exception as e:
        raise ValueError(f"解析pinpointAnswers时异常: {e}")

    # Step 4. 判断是否已存在
    pinpoint_seq = f"#{pinpoint.pinpoint_number}"
    if any(entry.get("sequence") == pinpoint_seq for entry in answers):
        ic(f"{pinpoint_seq} 已存在，跳过更新")
        return False  # 已存在，不更新

    # Step 5. 使用 AI 生成 clueHint
    ic("Generating clue hint with AI...")
    clue_hint = _generate_clue_hint_with_ai(pinpoint.clues, pinpoint.answer)
    clue_hint = _sanitize_for_template_literal(clue_hint)

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
        # answer用双引号json转义，clueHint用反引号，其他标准json
        clues_str = ", ".join(json.dumps(c, ensure_ascii=False) for c in entry["clues"])
        return (
            "  {\n"
            f'    sequence: "{entry["sequence"]}",\n'
            f'    date: "{entry["date"]}",\n'
            f"    answer: {json.dumps(entry['answer'], ensure_ascii=False)},\n"
            f"    clues: [{clues_str}],\n"
            f"    clueHint: `{entry['clueHint']}`,\n"
            "  },"
        )

    # 重新生成列表js字符串
    array_js = "[\n" + "\n".join(js_entry_repr(entry) for entry in answers) + "\n]"

    new_content = prefix + array_js + postfix

    # 清理 surrogate 字符，避免编码错误
    new_content = new_content.encode("utf-8", "ignore").decode("utf-8")

    with open(ts_file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    ic(f"已写入 {pinpoint_seq} 到 {ts_file_path}")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步当日 LinkedIn Pinpoint 答案")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只抓取并解析，打印结果，不写入文件、不调用 AI",
    )
    args = parser.parse_args()

    data = get_today_pinpoint()
    print(f"期号: #{data.pinpoint_number}")
    print(f"详情: {data.detail_url}")
    print(f"线索: {data.clues}")
    print(f"答案: {data.answer}")

    if args.dry_run:
        print("[dry-run] 未写入文件")
    else:
        updated = update_pinpoint_ts(data)
        print("更新完成" if updated else "无新增更新")
