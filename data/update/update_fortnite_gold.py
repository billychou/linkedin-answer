"""
抓取 Fortnite「Treasure Hunters」每周轮换的 Solid Gold 金色皮肤。

每周日换新一期(6AM PT / 9AM ET / 14:00 UTC):玩家在 Battle Royale 开宝箱随机免费
掉落当周金色皮肤。date/endDate/sequence/weekLabel/season 一律由周日锚点本地计算
(不信任源站),源站只提供 outfitName / extraRewards / odds。

数据源按序尝试(第一个产出合法条目者胜出,每源内部:结构化解析 → AI 兜底;
宁可全部失败告警,也不写来源不明的数据):
  1. IGN wiki: All Free Treasure Chest Rewards List - Odds and Schedule
  2. fortnite.gg/free-cosmetics
  3. timesaver.gg/blog/fortnite-weekly-quests

使用方法(仓库根目录运行):
    python3 data/update/update_fortnite_gold.py             # 同步本周
    python3 data/update/update_fortnite_gold.py --backfill  # 补齐缺失的历史周
    python3 data/update/update_fortnite_gold.py --dry-run   # 只打印本周条目文本,不写文件
"""

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from icecream import ic

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import requests  # noqa: E402
from ai_lib import chat  # noqa: E402
from bs4 import BeautifulSoup  # noqa: E402
from scrape_lib import (  # noqa: E402
    USER_AGENT,
    backfill_numbers,
    insert_entries,
    sleep_between_backfill_fetches,
)

TS_FILE_PATH = "./data/fortnite/weeklyGoldOutfit.ts"

# 必须与数据文件头逐字符一致(insert_entries 用 startswith 校验),以 "= " 结尾、"[" 之前
TS_PREFIX = '''/**
 * Fortnite Treasure Hunters — weekly Solid Gold outfit rotation.
 * AUTO-UPDATED by data/update/update_fortnite_gold.py (weekly GitHub Action).
 * The header above the array must stay byte-identical to TS_PREFIX in that
 * script — insert_entries() validates it. Do not edit above the array.
 */

export type WeeklyGoldReward = {
  name: string;
  type: string;
};

export type WeeklyGoldOutfit = {
  sequence: string; // "#N" — dedup key for scrape_lib.insert_entries
  date: string; // Sunday anchor, YYYY-MM-DD (week start, 6AM PT / 9AM ET)
  weekLabel: string; // "Week 2"
  season: string; // "Treasure Hunters"
  outfitName: string; // "Solid Gold Lil' Uzi Vert"
  endDate: string; // next Sunday anchor, YYYY-MM-DD
  odds?: string; // "About 1 in 1,562,500 chests"
  howToGet: string[]; // ordered steps
  extraRewards?: WeeklyGoldReward[];
  source?: string; // URL the data was scraped from
};

export const weeklyGoldOutfits: WeeklyGoldOutfit[] = '''

ET = ZoneInfo("America/New_York")
RESET_WEEKDAY = 6  # Sunday
RESET_HOUR = 9  # 9AM ET(= 6AM PT = 14:00 UTC,以 IGN 周窗口 "2:00pm UTC" 为准)
EPOCH_SUNDAY = date(2026, 11, 1)  # Treasure Hunters Week 1 锚点(周日;赛季至 2026-12-05,共 5 周)
SEASON = "Treasure Hunters"

DEFAULT_ODDS = "About 1 in 1,562,500 chests"
# 宝箱池常驻的事件机制物品(每周相同),不算"当周专属奖励",不进 extraRewards
GENERIC_EXCLUDE = {
    "pirate shop access",
    "extraction accelerator",
    "portable extractor",
    "golden firework",
    "sprite locator",
    "lucky locator",
}
DEFAULT_HOW_TO_GET = [
    "Queue into any Fortnite Battle Royale match during the week.",
    "Land and open Treasure Chests — the weekly Solid Gold outfit is a random chest drop.",
    "It is completely free: no purchase, no Battle Pass tier, and no quest chain required.",
    "The drop rate is extremely low, so keep opening chests across matches until it drops.",
    "Claim it before Sunday's reset (6AM PT / 9AM ET), when the rotation swaps in the next Solid Gold outfit.",
]

SOURCES = [
    (
        "ign",
        "https://www.ign.com/wikis/fortnite/All_Free_Treasure_Chest_Rewards_List_-_Odds_and_Schedule",
    ),
    ("fortnite.gg", "https://fortnite.gg/free-cosmetics"),
    ("timesaver", "https://timesaver.gg/blog/fortnite-weekly-quests"),
]

# 皮肤名 token:大写/$/撇号开头,允许 A$AP、Lil' 等形态
_TOKEN = r"[A-Z$'’][\w$'’.!*&-]*"
GOLD_OUTFIT_RE = re.compile(
    rf"Solid Gold\s+({_TOKEN}(?:\s+{_TOKEN}){{0,3}})\s*(?:Outfit|outfit|skin|Skin)"
)
# IGN 等 wiki 的权威周小节标题:"Week N Treasure Chest Rewards and Drop Rates"。
# 不能用裸 "Week N" 匹配——页面其他部分(旧赛季任务表)也用同样的周标签。
TREASURE_SECTION_RE = re.compile(
    r"Week\s*(\d+)\s+Treasure\s+Chest\s+Rewards", re.IGNORECASE
)

TYPE_SUFFIXES = [
    ("Back Bling", "Back Bling"),
    ("Loading Screen", "Loading Screen"),
    ("Jam Track", "Jam Track"),
    ("Vehicle", "Vehicle Skin"),
    ("Pickaxe", "Pickaxe"),
    ("Contrail", "Contrail"),
    ("Emote", "Emote"),
    ("Spray", "Spray"),
    ("Wrap", "Wrap"),
    ("Banner", "Banner"),
    ("Toy", "Toy"),
    ("Outfit", "Outfit"),
]


# ---------------------------------------------------------------- 周期计算

def current_anchor(now: datetime | None = None) -> date:
    """最近一个已过去的周日锚点;周日 9AM ET(6AM PT)前仍属上一周。"""
    now_et = (now or datetime.now(ET)).astimezone(ET)
    delta = (now_et.weekday() - RESET_WEEKDAY) % 7
    anchor = (now_et - timedelta(days=delta)).date()
    if delta == 0 and now_et.hour < RESET_HOUR:
        anchor -= timedelta(days=7)
    return anchor


def week_number(anchor: date) -> int:
    days = (anchor - EPOCH_SUNDAY).days
    if days < 0 or days % 7 != 0:
        raise ValueError(f"{anchor} 不是有效周日锚点(epoch {EPOCH_SUNDAY})")
    return days // 7 + 1


# ---------------------------------------------------------------- 抓取与解析

def _fetch_html(url: str) -> str:
    resp = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.text


def _soup_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n"))


def _clean_name(captured: str) -> str:
    return f"Solid Gold {captured.strip().strip('.,;:-–—')}"


def _split_type(name: str) -> tuple[str, str]:
    """剥离名称末尾的装饰类型,如 "Cadillac CT5-V Blackwing Vehicle" → (名称, Vehicle Skin)。"""
    for suffix, cosmetic_type in TYPE_SUFFIXES:
        if name.endswith(" " + suffix) and len(name) > len(suffix) + 1:
            return name[: -(len(suffix) + 1)].strip(), cosmetic_type
    return name, "Cosmetic"


def _extract_confident(text: str, anchor: date) -> dict | None:
    """命中 "Week N Treasure Chest Rewards" 小节并解析奖励表(高置信,当前/历史周通用)。

    奖励行在纯文本里形如 "1 in <odds>\n\n<名称>\n";小节若带 "ends on <日期>" 结尾,
    交叉校验其等于 anchor+7 天,防止抓到错误周的段落。不做全文启发式兜底——
    宁可返回 None 交给 AI/下一源,也不写错周数据。
    """
    wk = week_number(anchor)
    for m in TREASURE_SECTION_RE.finditer(text):
        if int(m.group(1)) != wk:
            continue
        nxt = TREASURE_SECTION_RE.search(text, m.end())
        section = text[m.start() : nxt.start() if nxt else m.start() + 8000]
        dm = re.search(r"ends?\s+on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})", section)
        if dm:
            try:
                ends = datetime.strptime(dm.group(1), "%B %d, %Y").date()
            except ValueError:
                ends = None
            if ends and ends != anchor + timedelta(days=7):
                ic(f"Week {wk} 小节结尾日期 {ends} 与锚点 {anchor} 不符,跳过")
                continue
        rows = [
            (rm.group(2).strip(), rm.group(1))
            for rm in re.finditer(r"1 in ([\d,]+)\n\n([^\n]+)", section)
        ]
        outfit = None
        outfit_odds = None
        extras: list[dict] = []
        for name, odds in rows:
            gm = GOLD_OUTFIT_RE.search(name)
            if outfit is None and gm and name.lower().startswith("solid gold"):
                outfit = _clean_name(gm.group(1))
                outfit_odds = odds
                continue
            base, ctype = _split_type(name)
            if base.lower() != (outfit or "").lower():
                extras.append({"name": base, "type": ctype})
        if outfit:
            return {
                "outfitName": outfit,
                "odds": f"About 1 in {outfit_odds} chests" if outfit_odds else None,
                "extraRewards": extras,
            }
    return None


def _focus_text(text: str) -> str:
    """截取关键词附近窗口,控制 AI 输入规模。"""
    idx = text.find("Solid Gold")
    if idx < 0:
        idx = text.lower().find("week")
    if idx < 0:
        return text[:16000]
    start = max(0, idx - 2000)
    return text[start : start + 16000]


def _ai_extract(text: str, anchor: date) -> dict | None:
    """AI 兜底:要求返回严格 JSON;DASHSCOPE_API_KEY 缺失时 chat 返回 None 自动跳过。"""
    system = (
        "You extract Fortnite weekly reward data from scraped web page text. "
        "The page describes a weekly rotation where one Solid Gold outfit is a "
        "free random drop from Treasure Chests. Return ONLY a strict JSON object: "
        '{"outfitName": string, "weekNumber": int|null, '
        '"extraRewards": [{"name": string, "type": string}], "odds": string|null}. '
        'outfitName must be the full cosmetic name including "Solid Gold". '
        "No prose, no code fences. If the data is absent, return {}."
    )
    user = (
        f"Week start (Sunday anchor): {anchor.isoformat()}. "
        f"Week end (next Sunday): {(anchor + timedelta(days=7)).isoformat()}. "
        f"This is Week {week_number(anchor)} of the season. "
        "Find the Solid Gold outfit for EXACTLY this week (not a past or "
        "leaked future week).\n\nPage text:\n" + _focus_text(text)
    )
    raw = chat(system, user)
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        obj = json.loads(cleaned)
    except json.JSONDecodeError:
        ic("AI 返回非法 JSON,跳过该源")
        return None
    if not isinstance(obj, dict) or not str(obj.get("outfitName") or "").strip():
        return None
    return obj


def _validate(raw: dict, anchor: date) -> dict:
    """源站只提供名称/奖励/掉率;日期与期号一律本地计算。校验防 AI 幻觉。"""
    name = re.sub(r"\s+", " ", str(raw.get("outfitName") or "")).strip(" .,;:-–—")
    if not re.search(r"\bgold\b", name, re.IGNORECASE):
        raise ValueError(f"outfitName 不含 gold,疑似解析错误: {name!r}")
    if len(name) > 80 or len(name.split()) > 8:
        raise ValueError(f"outfitName 异常: {name!r}")

    src_week = raw.get("weekNumber")
    wk = week_number(anchor)
    if isinstance(src_week, int) and src_week != wk:
        raise ValueError(f"源标注 Week {src_week} 与本地锚点 Week {wk} 不符,疑似抓错周")

    odds = raw.get("odds")
    rewards = []
    for r in raw.get("extraRewards") or []:
        if not isinstance(r, dict) or not str(r.get("name") or "").strip():
            continue
        rname = str(r["name"]).strip()[:80]
        if rname.lower() == name.lower() or rname.lower() in GENERIC_EXCLUDE:
            continue
        rewards.append(
            {"name": rname, "type": str(r.get("type") or "Reward").strip()[:40]}
        )

    return {
        "sequence": wk,
        "date": anchor.isoformat(),
        "weekLabel": f"Week {wk}",
        "season": SEASON,
        "outfitName": name,
        "endDate": (anchor + timedelta(days=7)).isoformat(),
        "odds": odds
        if isinstance(odds, str) and re.search(r"\d", odds) and len(odds) <= 80
        else DEFAULT_ODDS,
        "howToGet": list(DEFAULT_HOW_TO_GET),
        "extraRewards": rewards[:10],
        "source": str(raw.get("source") or ""),
    }


def _get_week(anchor: date) -> dict:
    errors = []
    for name, url in SOURCES:
        try:
            text = _soup_text(_fetch_html(url))
        except Exception as e:
            errors.append(f"{name}: 抓取失败: {e}")
            continue
        raw = _extract_confident(text, anchor)
        if not raw:
            raw = _ai_extract(text, anchor)
        if not raw:
            errors.append(f"{name}: 未提取到 Week {week_number(anchor)} 的金色皮肤")
            continue
        raw = dict(raw)
        raw["source"] = url
        try:
            return _validate(raw, anchor)
        except ValueError as e:
            errors.append(f"{name}: 校验拒收: {e}")
    raise RuntimeError("所有数据源均失败:\n  " + "\n  ".join(errors))


# ---------------------------------------------------------------- 写入

def _entry_text(e: dict) -> str:
    lines = [
        "  {",
        f'    sequence: "#{e["sequence"]}",',
        f'    date: "{e["date"]}",',
        f"    weekLabel: {json.dumps(e['weekLabel'], ensure_ascii=False)},",
        f"    season: {json.dumps(e['season'], ensure_ascii=False)},",
        f"    outfitName: {json.dumps(e['outfitName'], ensure_ascii=False)},",
        f'    endDate: "{e["endDate"]}",',
    ]
    if e.get("odds"):
        lines.append(f"    odds: {json.dumps(e['odds'], ensure_ascii=False)},")
    lines.append("    howToGet: [")
    for step in e["howToGet"]:
        lines.append(f"      {json.dumps(step, ensure_ascii=False)},")
    lines.append("    ],")
    if e.get("extraRewards"):
        lines.append("    extraRewards: [")
        for r in e["extraRewards"]:
            lines.append(
                "      { name: "
                + json.dumps(r["name"], ensure_ascii=False)
                + ", type: "
                + json.dumps(r["type"], ensure_ascii=False)
                + " },"
            )
        lines.append("    ],")
    if e.get("source"):
        lines.append(f"    source: {json.dumps(e['source'], ensure_ascii=False)},")
    lines.append("  },")
    return "\n".join(lines) + "\n"


def update_fortnite_ts(entries: list[dict], ts_file_path: str = TS_FILE_PATH) -> int:
    wrapped = [(e["sequence"], f'#{e["sequence"]}', _entry_text(e)) for e in entries]
    written = insert_entries(ts_file_path, TS_PREFIX, wrapped)
    if written:
        nums = ", ".join(
            f'#{e["sequence"]}'
            for e in sorted(entries, key=lambda x: -x["sequence"])[:written]
        )
        ic(f"Successfully updated {ts_file_path} with {written} entries: {nums}")
    else:
        ic("所有期号均已存在,跳过更新")
    return written


def backfill(ts_file_path: str = TS_FILE_PATH):
    """补齐数据文件中缺失的历史周(扫描现有最老期号到本周之间的所有缺口)。"""
    anchor = current_anchor()
    missing = backfill_numbers(ts_file_path, week_number(anchor))
    if not missing:
        ic("本地已完整,无需补抓")
        return

    ic(f"发现 {len(missing)} 周缺口: #{missing[0]}~#{missing[-1]}")
    fetched: list[dict] = []
    for num in missing:
        week_anchor = EPOCH_SUNDAY + timedelta(days=7 * (num - 1))
        ic(f"Backfilling #{num} ({week_anchor}) ...")
        try:
            fetched.append(_get_week(week_anchor))
        except Exception as e:
            ic(f"#{num} 抓取/解析失败,跳过: {e}")
        sleep_between_backfill_fetches()

    written = update_fortnite_ts(fetched, ts_file_path)
    ic(f"Backfill 完成:新写入 {written} 周")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="同步/补齐 Fortnite 周更金色皮肤数据")
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="补齐数据文件中缺失的历史周(从最老已有期号到本周)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="抓取并打印本周条目文本,不写文件",
    )
    args = parser.parse_args()

    if args.backfill:
        backfill()
    else:
        entry = _get_week(current_anchor())
        ic(
            f'{entry["weekLabel"]}: {entry["outfitName"]} '
            f'({entry["date"]} ~ {entry["endDate"]})'
        )
        if args.dry_run:
            print(_entry_text(entry))
        else:
            written = update_fortnite_ts([entry])
            print(f"更新完成(写入 {written} 条)" if written else "无新增更新")
