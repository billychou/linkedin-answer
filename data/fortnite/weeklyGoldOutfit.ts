/**
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

export const weeklyGoldOutfits: WeeklyGoldOutfit[] = [
  {
    sequence: "#2",
    date: "2026-11-08",
    weekLabel: "Week 2",
    season: "Treasure Hunters",
    outfitName: "Solid Gold Lil' Uzi Vert",
    endDate: "2026-11-15",
    odds: "About 1 in 1,562,500 chests",
    howToGet: [
      "Queue into any Fortnite Battle Royale match during the week.",
      "Land and open Treasure Chests — the weekly Solid Gold outfit is a random chest drop.",
      "It is completely free: no purchase, no Battle Pass tier, and no quest chain required.",
      "The drop rate is extremely low, so keep opening chests across matches until it drops.",
      "Claim it before Sunday's reset (6AM PT / 9AM ET), when the rotation swaps in the next Solid Gold outfit.",
    ],
    extraRewards: [
      { name: "Cadillac CT5-V Blackwing", type: "Vehicle Skin" },
      { name: "Diamond and Gold", type: "Back Bling" },
      { name: "\"London\" Lil' Uzi Vert", type: "Jam Track" },
      { name: "So Kawaii", type: "Loading Screen" },
    ],
    source: "https://www.ign.com/wikis/fortnite/All_Free_Treasure_Chest_Rewards_List_-_Odds_and_Schedule",
  },
  {
    sequence: "#1",
    date: "2026-11-01",
    weekLabel: "Week 1",
    season: "Treasure Hunters",
    outfitName: "Solid Gold A$AP Rocky",
    endDate: "2026-11-08",
    odds: "About 1 in 1,562,500 chests",
    howToGet: [
      "Queue into any Fortnite Battle Royale match during the week.",
      "Land and open Treasure Chests — the weekly Solid Gold outfit is a random chest drop.",
      "It is completely free: no purchase, no Battle Pass tier, and no quest chain required.",
      "The drop rate is extremely low, so keep opening chests across matches until it drops.",
      "Claim it before Sunday's reset (6AM PT / 9AM ET), when the rotation swaps in the next Solid Gold outfit.",
    ],
    extraRewards: [
      { name: "Solid Gold A$AP Rocky's Gauntlet", type: "Pickaxe" },
      { name: "\"Plunder In Paradise\" A$AP Rocky", type: "Loading Screen" },
      { name: "\"No Trespassing\" A$AP Rocky", type: "Jam Track" },
      { name: "Mercedes-AMG G 63 G-Wagon", type: "Vehicle Skin" },
    ],
    source: "https://www.ign.com/wikis/fortnite/All_Free_Treasure_Chest_Rewards_List_-_Odds_and_Schedule",
  },
];

/**
 * 取"当前周"条目:数组按 date 降序,第一条 endDate 尚未过去者即当前周。
 * 静态导出下 now 在构建时求值;数据 commit 后 Pages 自动重建,构建时间即最新。
 * isLive === false 表示最新一期窗口也已结束(数据过期),页面应显示降级文案。
 */
export function getCurrentGoldWeek(now: Date = new Date()): {
  current: WeeklyGoldOutfit | undefined;
  isLive: boolean;
} {
  const todayIso = now.toISOString().slice(0, 10);
  const current =
    weeklyGoldOutfits.find((w) => w.endDate >= todayIso) ?? weeklyGoldOutfits[0];
  return { current, isLive: !!current && current.endDate >= todayIso };
}
