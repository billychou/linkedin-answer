"""DashScope（OpenAI 兼容）分析生成工具。

为各游戏答案生成原创解析文本（clueHint）。未配置 DASHSCOPE_API_KEY
或调用失败时返回调用方提供的 fallback 模板，保证数据管道永不断流。

环境变量：
    DASHSCOPE_API_KEY  必需（缺省则全部走 fallback）
    DASHSCOPE_MODEL    可选，默认 qwen-plus
    DASHSCOPE_BASE_URL 可选，默认国际站兼容模式端点
"""

import os
import re

import requests

DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
DEFAULT_MODEL = "qwen-plus"

ALLOWED_TAGS = {"p", "strong", "em", "br", "ul", "ol", "li"}


def sanitize_html(html: str) -> str:
    """只保留白名单标签，剥掉事件属性与脚本，防止脏数据进 dangerouslySetInnerHTML。"""
    html = html.replace("`", "'").strip()

    def repl(m: re.Match) -> str:
        tag = m.group(1).lower()
        if tag not in ALLOWED_TAGS:
            return ""
        return f"<{tag}>" if not m.group(0).startswith("</") else f"</{tag}>"

    html = re.sub(r"</?([a-zA-Z][a-zA-Z0-9]*)[^>]*>", repl, html)
    return html.strip()


def chat(system_prompt: str, user_prompt: str, timeout: int = 60) -> str | None:
    """调用 DashScope 兼容 chat/completions；不可用/失败时返回 None。"""
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        return None
    base_url = os.environ.get("DASHSCOPE_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    model = os.environ.get("DASHSCOPE_MODEL", DEFAULT_MODEL)
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "temperature": 0.7,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return content.strip() or None
    except Exception as e:  # noqa: BLE001 — 生成失败不应中断数据管道
        print(f"[ai] DashScope 调用失败，使用 fallback: {e}")
        return None


def generate_clue_hint(user_prompt: str, fallback_html: str) -> str:
    """优先 AI 生成（含白名单清洗），失败时返回 fallback 模板。

    统一系统提示词：站点是英文内容，输出限定为简短 <p> 段落。
    """
    system_prompt = (
        "You write solution walkthroughs for LinkedIn Answers, a site about "
        "LinkedIn's daily puzzle games. Write in English. Output ONE short "
        "paragraph (2-4 sentences) wrapped in <p>...</p>. You may use "
        "<strong> and <br> only. Explain the reasoning or strategy behind "
        "today's solution; do not pad with generic filler."
    )
    generated = chat(system_prompt, user_prompt)
    if not generated:
        return fallback_html
    # 模型偶尔输出代码块围栏或多段落，收敛为单段
    text = generated.strip().strip("`").strip()
    text = re.sub(r"^html\s*", "", text, flags=re.IGNORECASE)
    if not text.startswith("<p>"):
        text = f"<p>{text}</p>" if "<p>" not in text else text
    return sanitize_html(text)


def ts_clue_hint_field(html: str) -> str:
    """渲染为 TS 模板字符串字段；转义反斜杠/反引号/${，防止破坏数据文件。"""
    safe = html.replace("\\", "\\\\").replace("`", "'").replace("${", "\\${")
    return f"    clueHint: `{safe}`,"
