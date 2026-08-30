# SEO 运营手册 — LinkedIn Answer Today

> 面向运营者的可执行清单。站内技术改造（/today 聚合页、IndexNow 推送、llms.txt、RSS、内链增强）已随代码上线，本手册聚焦「收录」与「外链」两条增长线。

站点：`https://linkedinanswer.today`（Cloudflare Pages 静态导出）

---

## 0. 现状与目标

- 内容资产：7 款游戏 × 历史答案页（约 850 条）+ 每日自动更新 + 10 篇攻略博客 + how-to-play 页。
- 主要短板：**Google 收录接近零、无外链、未接入任何搜索引擎后台**。竞品（fandomwire 等）靠每日 "All LinkedIn Games Solutions Today" 文章占据流量。
- 90 天目标：
  1. Google / Bing 收录核心页面（首页、/today、各游戏页、当日答案页）。
  2. 建立首批 20+ 外链（目录站 + 社区 + 社媒）。
  3. "linkedin <game> answer today" 类长尾词进入 Google 前 3 页。

---

## 1. 收录基建（第一优先级，1 天内完成）

### 1.1 Google Search Console

1. 打开 <https://search.google.com/search-console>，添加资源，选「网域」或「网址前缀 `https://linkedinanswer.today`」。
2. 验证方式选「HTML 标记」，复制 `content="..."` 里的验证码。
3. 在 Cloudflare Pages → Settings → Environment variables 增加构建变量：
   - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<验证码>`（代码已支持，构建后自动注入 `<meta name="google-site-verification">`）。
4. 重新部署后，回到 GSC 点「验证」。
5. 提交站点地图：左侧「站点地图」→ 填 `sitemap.xml` → 提交。
6. 对首页、`/today`、7 个游戏页用顶部「网址检查」逐条请求编入索引（每天有配额，分几天做完）。

### 1.2 Bing Webmaster Tools

1. 打开 <https://www.bing.com/webmasters>，可直接「从 Google Search Console 导入」（完成 1.1 后一键导入）。
2. 或用验证码方式：把 `msvalidate.01` 的值配到 `NEXT_PUBLIC_BING_SITE_VERIFICATION` 后重新部署。
3. 提交 `sitemap.xml`。
4. 在「IndexNow」页可直接看到每日自动推送的 URL（代码已接入，见 1.3）。

### 1.3 IndexNow（已接入，无需额外操作）

- 每日答案更新（GitHub Actions 提交成功后）会自动向 IndexNow 推送 `/today`、对应游戏页、当日答案页、档案页，Bing/Yandex/Seznam/Naver 即时抓取。
- 密钥文件：`public/1c91269052e09cd422942be6d7de112e.txt`（脚本 `scripts/indexnow.sh`）。
- 可选加固：在 Cloudflare Pages → Settings → Index Now 里开启托管版（与代码版并存不冲突）。

### 1.4 抓取健康自检

```bash
curl -s https://linkedinanswer.today/robots.txt | head
curl -s https://linkedinanswer.today/sitemap.xml | head -c 400
curl -s https://linkedinanswer.today/feed.xml | head -c 400
curl -s https://linkedinanswer.today/llms.txt | head
```
四者均返回 200 且内容非空即正常。

---

## 2. 外链建设（持续进行）

外链按「易→难、低风险→高价值」排序。每完成一项在下方清单打勾。

### 2.1 自有阵地（零门槛，先做）

- [ ] **GitHub**：在 `github.com/billychou` 个人主页 / 相关仓库 README 里放站点链接；可把 `data/update/` 抓取脚本开源成独立仓库（答案站 + 开源数据管道双入口）。
- [ ] **X / Bluesky 官方号**：简介里放站点链接；每天发布当日答案贴（模板见 4.2）。社交帖虽多为 nofollow，但能带来真实点击与被 AI 检索引用。
- [ ] **Newsletter**：站内已有订阅表单；每期摘要文末附站点链接，转发即外链。

### 2.2 目录 / 工具站提交（每站 10 分钟）

| 站点 | 类型 | 备注 |
| --- | --- | --- |
| AlternativeTo | 软件目录 | 把本站登记为 LinkedIn Games 的答案工具 |
| Toolify.ai / There's An AI For That | AI 工具目录 | 强调「AI 生成线索解析」 |
| Uneed.best / Peerlist | 独立开发者目录 | 适合发布 launch |
| Product Hunt | 产品发布 | 见 4.1 文案 |
| 独立开发者导航（如 awesome-indie 类仓库） | GitHub 列表 | 提 PR 收录 |

提交用统一短介绍（见 4.3）。

### 2.3 社区（重价值、轻广告）

> 原则：先回答别人的问题，顺带给链接；不要裸发广告，遵守各版规。

- [ ] **Reddit**：关注 `r/puzzles`、`r/wordgames`、`r/crossword`、`r/LinkedIn`。搜索 "pinpoint answer / queens stuck / linkedin games"，在求助帖下给出当日答案 + 思路，末尾附站点。
- [ ] **Quora**：回答 "How do I solve LinkedIn Pinpoint?" 类问题，正文给策略，结尾引用站点攻略页。
- [ ] **Hacker News**：以 Show HN 形式发布「开源的 LinkedIn 游戏答案数据管道」（技术角度，非答案站角度），更容易被接受。
- [ ] **V2EX / 即刻**（中文）：分享「用 Cloudflare Pages + GitHub Actions 做每日答案站」的技术实践，带站点。

### 2.4 内容换链接（中期）

- [ ] 给同类谜题站（Wordle/Connections 答案站）发邮件提议互链或资源互换。
- [ ] 向谜题类 newsletter（如 puzzle 主题 Substack）投稿或自荐收录。
- [ ] 发布「LinkedIn Games 数据报告」（基于自有历史答案数据：如各答案类型分布、最长连胜词等），数据类内容天然吸引引用。

### 2.5 外链进度追踪

在 Bing Webmaster「外链」与 GSC「链接」里每月核对一次；用一张表记录：来源、URL、日期、状态。

---

## 3. 内容与站内运营

- **每日**：确认 7 款游戏当日答案更新成功（已有 `answer-freshness.yml` 告警）。`/today` 页随之自动更新。
- **每周**：博客新增 1 篇，瞄准长尾词，例如：
  - "LinkedIn Queens strategy: how to win every day"
  - "What time do LinkedIn games reset?"（时区向）
  - "LinkedIn Crossclimb vs Wordle: which is harder?"
- **每月**：用 GSC「效果」报表筛出已有展示但点击率低的词，针对性优化标题/描述。
- **内链**：新增游戏或博客时，记得在 `/today`、footer、相关 how-to-play 页补链接（本次已建立框架）。

---

## 4. 即用文案草稿

### 4.1 Product Hunt

- **名称**：LinkedIn Answer Today
- **一句话**：Daily answers & explanations for every LinkedIn game — updated the moment new puzzles go live.
- **描述**：
  Stuck on today's LinkedIn Pinpoint, Queens, or Crossclimb? LinkedIn Answer Today publishes the answer for all seven LinkedIn games every day, with clue-by-clue explanations so you actually understand the solution. Includes full archives, how-to-play guides, and strategy tips. Free, no login.
- **Topics**：Puzzles, Productivity, Games, AI
- **首发时间**：建议太平洋时间周二至周四 00:01。

### 4.2 X / Bluesky 每日答案贴（模板）

```
LinkedIn games answers for {DATE} 🧩
Pinpoint: {ANSWER}
Queens: #{SEQ}
Crossclimb: {WORD}
…
Full solutions + why they work:
https://linkedinanswer.today/today
#LinkedInGames #puzzles
```

### 4.3 目录站统一短介绍（约 50 词）

> LinkedIn Answer Today is a free, no-login site that publishes daily answers, hints, and clue-by-clue explanations for all seven LinkedIn games (Pinpoint, Crossclimb, Zip, Queens, Tango, Patches, Mini Sudoku), with full archives and strategy guides. Answers update automatically the moment new puzzles go live.

### 4.4 Reddit / Quora 回答模板

> The {GAME} answer for today ({DATE}) is **{ANSWER}**. The trick is {ONE_LINE_REASON}. If you want the clue-by-clue breakdown (and yesterday's in case you're catching up), I keep them updated here: https://linkedinanswer.today/games/{SLUG}

---

## 5. 二期路线（收录稳定后再做）

1. **多语言独立 URL**：当前中/日文案仅客户端切换、无独立网址，搜索引擎无法收录。二期引入 `[locale]` 路由 + hreflang，把 `blogs/zh|ja` 与翻译文案变成真实页面，吃下「linkedin 小游戏答案」等中文/日文长尾流量。
2. **Google Indexing API / 自动推送**：对当日答案页做更主动的提交。
3. **结构化数据扩展**：为答案页补 `Quiz`/`HowTo` schema，争取富结果。
4. **程序化 SEO 扩面**：基于历史答案生成 "Pinpoint answer archive by month" 等聚合页。

---

## 6. 风险提示

- 社交与社区推广务必「先给价值再带链接」，避免被判垃圾广告导致封号或降权。
- 外链宁缺毋滥：避开付费垃圾外链农场，Google 的垃圾链接政策会反噬。
- 答案内容属用户刚需但同质化高，长期壁垒在「解析质量 + 更新速度 + 数据资产」，持续投入解析生成（DASHSCOPE clueHint）。
