# LinkedIn Answer Today

LinkedIn 小游戏(Pinpoint、Crossclimb、Zip、Tango、Queens、Patches 等)的每日答案站,附带 AI 聊天与内置小游戏。

前端为 Next.js 16 **静态导出**,服务端逻辑全部跑在 **Cloudflare Pages Functions** 上,数据库使用 **Cloudflare D1**(SQLite),无独立服务器。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | Next.js 16(App Router,`output: "export"` 静态导出到 `out/`) |
| 服务端 | Cloudflare Pages Functions(`functions/` 目录) |
| 数据库 | Cloudflare D1(SQLite,绑定名 `DB`,`migrations/` 管理表结构) |
| 登录 | Google OAuth → 服务端校验 ID Token → HttpOnly JWT Cookie 会话 |
| 用户体系 | 用户 + 身份(`users`/`user_identities`)+ 租户(`tenants`/`tenant_members`) |
| 国际化 | next-intl(en/zh/ja,`as-needed` 前缀) |
| UI | Tailwind CSS + Radix UI 组件,zustand 状态管理 |
| 包管理 | pnpm 10.x(Node 20.x) |

## 目录结构

```text
linkedin-answer/
├── app/                  # Next.js 页面(首页、games、chat、login、settings、admin)
├── components/           # 页面组件(header/settings/admin/games/...)
├── functions/            # Cloudflare Pages Functions(API 服务端)
│   ├── _middleware.ts    # 受保护路由拦截(/chat /settings /admin)
│   ├── _lib/             # 会话鉴权、D1 数据访问层
│   └── api/              # /api/auth、/api/me、/api/tenants、/api/admin ...
├── migrations/           # D1 SQL 迁移(wrangler d1 migrations)
├── data/  content/  blogs/ # 游戏答案数据与 MDX 内容
├── i18n/                 # next-intl 配置与文案(en/zh/ja)
├── lib/  stores/  types/ # 客户端工具、zustand store、类型定义
├── scripts/              # 答案自动更新等运维脚本
├── wrangler.toml         # wrangler 本地开发配置(D1 绑定)
└── cloudflare.toml       # Cloudflare Pages 构建配置(输出目录 out/)
```

## 快速开始

### 前置条件

- Node.js 20.x(`.nvmrc`)、pnpm 10.x(`packageManager` 已锁定,建议 `corepack enable`)
- 一个 Cloudflare 账号(D1 数据库与部署用;仅本地前端可不需要)

### 1. 安装依赖与环境变量

```bash
pnpm install

# Next.js 构建期变量(NEXT_PUBLIC_*、GOOGLE_CLIENT_ID 等)
cp .env.example .env

# Pages Functions 运行时变量(wrangler 本地专用,已 gitignore)
cat > .dev.vars <<'VARS'
SESSION_SECRET=<openssl rand -base64 48 生成,需与 .env 一致>
DEV_FAKE_LOGIN=true
VARS
```

- `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`:Google Cloud Console 的 OAuth Client ID,需授权 `http://localhost:8788`(wrangler)与 `http://localhost:3000`(next dev)。
- `DEV_FAKE_LOGIN=true`:仅本地,启用 `/api/auth/dev-login` 与登录页的 "Dev login" 按钮(wrangler 沙箱无法访问 Google JWKS 时的替代登录)。**切勿在生产配置。**

### 2. 初始化本地 D1 数据库

```bash
npx wrangler d1 migrations apply linkedin-answer --local
```

本地库保存在 `.wrangler/state/`,不影响远端。

### 3. 启动

#### 方式 A:全栈本地(推荐,前端 + API + D1)

```bash
pnpm build                          # 静态导出到 out/
npx wrangler pages dev out          # http://localhost:8788
```

`wrangler pages dev` 会同时加载 `functions/`(API)、`wrangler.toml` 的 D1 绑定和 `.dev.vars` 变量。改动了 `app/` 页面需重新 `pnpm build`;改动 `functions/` 重启即可。

打开 http://localhost:8788,在 `/login` 用 "Dev login" 登录即可体验完整的用户/租户流程。

#### 方式 B:仅前端(改样式/文案时更快)

```bash
pnpm dev                            # http://localhost:3000
```

注意:`next dev` 不会加载 `functions/`,`/api/*` 不可用,登录与设置页等依赖 API 的功能需走方式 A。

### 常用 wrangler 命令

```bash
# 全栈本地开发(静态产物 + Functions + 本地 D1)
npx wrangler pages dev out

# 数据库迁移:本地 / 生产
npx wrangler d1 migrations apply linkedin-answer --local
npx wrangler d1 migrations apply linkedin-answer --remote

# 直接对本地 / 生产库执行 SQL
npx wrangler d1 execute linkedin-answer --local  --command "SELECT email, role FROM users"
npx wrangler d1 execute linkedin-answer --remote --command "SELECT COUNT(*) FROM tenants"

# 查看远端 D1 列表
npx wrangler d1 list
```

> 首次使用 `--remote` 需要 `npx wrangler login`。生产 D1 还需在 Cloudflare Pages 控制台
> Settings → Bindings 绑定同名 binding `DB`。

## 环境变量一览

| 变量 | 位置 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `.env`(构建期) | 站点正式 URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `.env`(构建期,勿加密) | Google OAuth Client ID |
| `GOOGLE_CLIENT_ID` | `.env` / 控制台(运行时) | 服务端校验 ID Token 用,与上同值 |
| `SESSION_SECRET` | `.env` + `.dev.vars` / 控制台 | 会话 JWT 签名密钥 |
| `DEV_FAKE_LOGIN` / `NEXT_PUBLIC_DEV_FAKE_LOGIN` | 仅本地 | 启用 dev 登录,生产勿配 |
| `NEXT_PUBLIC_GOOGLE_ID` 等 | `.env`(构建期) | 各类统计 ID,可选 |

完整清单见 `.env.example`;生产变量在 Cloudflare Pages 控制台配置,详见 `CLOUDFLARE_DEPLOYMENT.md`。

## 用户体系与租户

- Google 登录即落库:`users`(内部 UUID 主键)+ `user_identities`(多登录方式合并)。
- 会话:HttpOnly JWT Cookie(7 天),JWT 仅作缓存,权限一律查库。
- 租户:每个用户首次登录自动获得个人租户,可创建团队租户、按邮箱邀请成员;`/settings` 的 Team 页管理。
- 管理台:`/admin`(仅 `users.role === 'admin'`),管理全站用户与租户。
- 设计与权限细节见 [`docs/user-system-design.md`](docs/user-system-design.md)。

## 部署(Cloudflare Pages)

1. 仓库接入 Cloudflare Pages Git 集成:构建命令 `pnpm install && pnpm build`,输出目录 `out/`(`cloudflare.toml` 已声明)。
2. Settings → Bindings 绑定 D1 数据库,binding 名 `DB`。
3. 控制台配置运行时变量:`GOOGLE_CLIENT_ID`、`SESSION_SECRET`(与本地一致)。
4. 应用生产迁移:`npx wrangler d1 migrations apply linkedin-answer --remote`。

详细步骤与踩坑记录见 [`CLOUDFLARE_DEPLOYMENT.md`](CLOUDFLARE_DEPLOYMENT.md)、[`CLOUDFLARE_PAGES_SETUP.md`](CLOUDFLARE_PAGES_SETUP.md)。

## 常用脚本

```bash
pnpm dev          # Next.js 开发服务器(仅前端)
pnpm build        # 生产构建 + 静态导出到 out/
pnpm lint         # ESLint(flat config,见 eslint.config.mjs)
npx tsc --noEmit  # 前端类型检查
```

> `functions/` 不在根 tsconfig 的 `include` 内(由 wrangler 编译),如需类型检查可
> 用独立配置:`npx tsc --noEmit --strict --target es2022 --module esnext
> --moduleResolution bundler --lib es2022,dom functions/**/*.ts`。

答案数据的定时更新见 [`cron-task.md`](cron-task.md) 与 `scripts/`。

## 相关文档

- [`docs/user-system-design.md`](docs/user-system-design.md) — 用户/租户系统设计
- [`docs/seo-operations.md`](docs/seo-operations.md) — SEO 运营手册（收录、外链、内容运营）
- [`CLOUDFLARE_DEPLOYMENT.md`](CLOUDFLARE_DEPLOYMENT.md) — Cloudflare Pages 部署完整方案
- [`AUTO_UPDATE.md`](AUTO_UPDATE.md) — 游戏答案自动更新
