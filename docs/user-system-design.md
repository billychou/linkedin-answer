# 用户系统设计（LinkedIn Answer Today）

> 目标：在现有 Google 登录基础上，补齐"登录后可查看/设置用户信息"的设置页，并让数据模型、API 和前端结构为后续"基于用户的支付订阅 SaaS"（Stripe 计费）做好准备。

## 1. 现状盘点

| 能力 | 现状 | 缺口 |
| --- | --- | --- |
| 登录 | Google OAuth，`/api/auth/login` 服务端验证 ID token | 登录后未落库，无持久化用户记录 |
| 会话 | HttpOnly JWT Cookie（`SESSION_SECRET`，7 天），`/api/auth/session` | JWT 里存的是 Google `sub`，与未来登录方式耦合 |
| 受保护路由 | `functions/_middleware.ts` 保护 `/chat` | 没有 `/settings`，也没有用户数据接口 |
| 前端状态 | zustand `userStore` 镜像会话 | 只有 JWT 缓存的 name/email/picture，没有用户资料字段 |
| 数据库 | 无 | **这是最大缺口**，订阅/支付无从谈起 |
| 可用依赖 | `zod`（校验）、`@upstash/redis` + `@upstash/ratelimit`（限流）、`resend`（邮件）、`jose`（JWT） | 无需新增基础依赖 |

技术栈结论：前端是 Next.js 16 **静态导出**（`output: "export"`），所有服务端逻辑都跑在 **Cloudflare Pages Functions** 上。因此：

- 数据库选 **Cloudflare D1**（SQLite，随 Functions 一起走，无需额外服务器，有 `wrangler d1` 迁移工具）。
- "服务器" = `functions/` 目录下的 API + middleware。
- 设置页是静态 HTML + 客户端拉取 `/api/me`，登录态由现有 JWT Cookie 承载。

## 2. 总体架构

```text
浏览器 (Next.js 静态导出)
  │  登录/登出/会话  (HttpOnly JWT Cookie)
  ▼
Cloudflare Pages Functions
  ├─ _middleware.ts      → /settings、/chat 等受保护路径的访问控制
  ├─ /api/auth/*         → 登录、会话、登出（现有，改造）
  ├─ /api/me             → 用户资料读取/更新（新增）
  ├─ /api/billing/*      → 订阅、结账、账单门户（二期）
  └─ /api/stripe/webhook → 支付事件回调（二期）
  │
  ▼
Cloudflare D1（SQLite）
  users / user_identities / plans / subscriptions / invoices / webhook_events
  │
  └─ Stripe（二期）：Checkout、Billing Portal、Webhook
```

## 3. 关键设计决策

### 3.1 用户主键：内部 UUID + 身份表，而不是直接用 Google sub

当前会话 JWT 的 `sub` 直接是 Google 的 subject。这有两个问题：

1. 订阅、订单等业务数据都会挂在 `sub` 上，以后如果新增"邮箱密码登录"或"Apple 登录"，同一用户会产生两个身份，业务数据无法合并。
2. SaaS 计费需要的是"我们系统的用户"，不是"Google 的用户"。

**决策**：`users.id` 用内部 UUID（`crypto.randomUUID()`），登录时通过 `user_identities` 表把 `google|<sub>` 映射到内部用户。会话 JWT 的 `sub` 改为内部 `users.id`，JWT 中的 name/email/picture 仅作为**缓存字段**，页面展示的最新资料一律以 `/api/me`（查库）为准。

> 如果只想最快落地、确定永远只用 Google 登录，也可以直接用 Google `sub` 当 `users.id`（省一张表）。本设计按"可扩展"路线走，成本只是多一张 `user_identities` 表。

### 3.2 会话：沿用现有 HttpOnly JWT，只改 claims

现有方案已经正确（HttpOnly、Secure、SameSite=Lax、7 天 TTL），不推倒重来：

- `sub` = 内部 `users.id`（原来为 Google sub）
- `email` / `name` / `picture` = 登录时的快照缓存
- 新增 `v`（资料版本号）可选，用于将来"资料变更后强制刷新会话缓存"；现阶段不需要

### 3.3 订阅：Stripe 为账本，D1 为业务状态，Webhook 驱动

- 每个用户一个 `stripe_customer_id`（存 `users` 表）。
- 套餐定义在 `plans` 表（代码里 seed），Stripe 侧通过 `stripe_price_id` 关联。
- `subscriptions` 表保存当前订阅状态，由 Stripe Webhook 事件（`customer.subscription.updated` / `deleted` 等）同步，**前端不直接信任 Stripe 返回值，只信任 `/api/me`/`/api/billing/*` 查库结果**。
- `webhook_events` 表用 Stripe 事件 ID 做唯一约束，保证幂等（重试/重复投递只处理一次）。

### 3.4 权限模型：`users.role` + 套餐功能开关

- `users.role`：`user` / `admin`，管后台和管理员接口。
- 功能权限（chat 次数、历史天数等）放 `plans.features_json`，提供一个 `getEntitlements(userId)` 帮助函数，在 API 入口处校验。**不要**把权限判断写死在页面里。

## 4. 数据模型（D1 DDL）

```sql
-- migration 0001：用户与身份
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,                 -- 内部 UUID
  email               TEXT NOT NULL UNIQUE,             -- 统一小写
  name                TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT NOT NULL DEFAULT '',
  bio                 TEXT NOT NULL DEFAULT '',
  locale              TEXT NOT NULL DEFAULT 'zh',       -- 界面语言 en/zh/ja
  timezone            TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  status              TEXT NOT NULL DEFAULT 'active',   -- active | disabled | deleted
  role                TEXT NOT NULL DEFAULT 'user',     -- user | admin
  stripe_customer_id  TEXT UNIQUE,
  created_at          INTEGER NOT NULL,                 -- unix ms
  updated_at          INTEGER NOT NULL,
  last_login_at       INTEGER
);

CREATE TABLE user_identities (
  provider          TEXT NOT NULL,      -- 'google' | 'password' | 'apple' ...
  provider_subject  TEXT NOT NULL,      -- 各提供方的用户 ID
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email             TEXT,
  created_at        INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_subject)
);
CREATE INDEX idx_identities_user ON user_identities(user_id);

-- migration 0002：套餐
CREATE TABLE plans (
  id                TEXT PRIMARY KEY,   -- 'free' | 'pro_monthly' | 'pro_yearly'
  name              TEXT NOT NULL,
  billing_interval  TEXT NOT NULL,      -- 'none' | 'month' | 'year'
  price_cents       INTEGER NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'usd',
  stripe_price_id   TEXT,
  features_json     TEXT NOT NULL DEFAULT '{}',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1
);

-- migration 0003：订阅与账单
CREATE TABLE subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL REFERENCES plans(id),
  status                TEXT NOT NULL,  -- trialing | active | past_due | canceled | expired
  current_period_start  INTEGER NOT NULL,
  current_period_end    INTEGER NOT NULL,
  cancel_at_period_end  INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_id TEXT UNIQUE,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_subs_user ON subscriptions(user_id, status);

CREATE TABLE invoices (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id     TEXT REFERENCES subscriptions(id),
  stripe_invoice_id   TEXT UNIQUE,
  amount_cents        INTEGER NOT NULL,
  currency            TEXT NOT NULL,
  status              TEXT NOT NULL,   -- open | paid | void | uncollectible
  hosted_invoice_url  TEXT,
  paid_at             INTEGER,
  created_at          INTEGER NOT NULL
);

CREATE TABLE webhook_events (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id   TEXT UNIQUE NOT NULL,   -- 幂等
  type              TEXT NOT NULL,
  payload           TEXT NOT NULL,
  processed_at      INTEGER
);
```

seed 数据（`plans`）：

| id | name | interval | price | features_json |
| --- | --- | --- | --- | --- |
| `free` | Free | none | 0 | `{"chatPerDay":5,"historyDays":7}` |
| `pro_monthly` | Pro Monthly | month | 599 | `{"chatPerDay":100,"historyDays":365,"priority":true}` |
| `pro_yearly` | Pro Yearly | year | 4990 | 同上 |

## 5. 认证与登录流程改造（登录即落库）

`/api/auth/login` 在验证 Google ID token 之后，新增一步"upsert 用户"：

1. `user_identities` 查 `('google', sub)`；
2. 不存在 → 新建 `users`（UUID）+ `user_identities`，发送欢迎邮件（可选，Resend）；
3. 存在 → 同步 email/name/picture、更新 `last_login_at`；
4. 签发会话 JWT：`sub = users.id`，claims 里带 email/name/picture 快照。

`/api/auth/session` 返回的 `user` 增加 `id`（内部用户 ID），前端 store 的 `GoogleUser` 类型扩展为 `CurrentUser`（保留旧字段兼容）。

## 6. API 设计

### 一期（随设置页上线）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/me` | 返回完整资料：id、email、name、avatar、bio、locale、timezone、role、subscription 摘要（免费/Pro） |
| PATCH | `/api/me` | 更新 `name` / `bio` / `avatar_url` / `locale` / `timezone`，zod 校验、白名单字段、返回新资料 |
| POST | `/api/auth/logout` | 现有，不变 |

响应示例（GET /api/me）：

```json
{
  "user": {
    "id": "1f2e...",
    "email": "user@gmail.com",
    "name": "Alice",
    "avatar_url": "https://...",
    "bio": "",
    "locale": "zh",
    "timezone": "Asia/Shanghai",
    "role": "user",
    "subscription": { "plan": "free", "status": "active" }
  }
}
```

PATCH 校验规则：`name` 1–50 字符；`bio` ≤ 500 字符；`locale` ∈ en/zh/ja；`timezone` ∈ IANA 时区列表；`avatar_url` 仅允许 HTTPS URL 或空串。

### 二期（订阅 SaaS）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/billing/subscription` | 当前套餐、周期、功能 entitlement、发票列表 |
| POST | `/api/billing/checkout` | body `{ planId }` → 创建 Stripe Checkout Session，返回 URL |
| POST | `/api/billing/portal` | 创建/复用 Stripe Billing Portal 会话（改支付方式、取消订阅） |
| POST | `/api/stripe/webhook` | Stripe 签名校验 → 幂等落库 → 更新 subscriptions/invoices |
| POST | `/api/me/export` | 导出用户全部数据（GDPR） |
| DELETE | `/api/me` | 注销账号（软删除 + 清理敏感数据） |

### 三期（管理后台 + 租户）

> ✅ **已实施（2026-08-11）**：租户系统（`tenants`/`tenant_members` 表、
> 登录自动创建个人租户、租户 CRUD/成员/切换 API）与管理后台
> （`/admin` 页面 + `/api/admin/users`、`/api/admin/tenants`）已实现并本地联调。
> 详见下文「11. 租户系统」。

管理员接口基于 `users.role === 'admin'` 鉴权（每次请求查库校验，不信任 JWT 缓存）。

## 7. 设置页设计

### 路由与访问控制

- 路由：`/settings`（跟随 `/chat` 的 i18n 模式，`as-needed` 前缀下覆盖 `/zh/settings`、`/en/settings`、`/ja/settings`）。
- 服务端：`functions/_middleware.ts` 的 `PROTECTED_PATHS` 加入 `/settings`，未登录 302 → `/login?next=/settings`。
- 客户端：`lib/authClient.ts` 的 `PROTECTED_PATHS` 同步加入，页面 mount 时 `fetchSession()`，无会话跳 `/login?next=/settings`。
- Header 的 `UserMenu` 增加"Settings"菜单项入口。

### 页面结构（单页 + Tab，移动端自适应）

```text
/settings
├─ 个人资料 Profile    显示名、头像、简介、语言、时区 → PATCH /api/me
├─ 账号 Account        邮箱（只读，来自 Google）、登录方式、登出
├─ 订阅 Subscription   当前套餐卡片、升级/降级入口、发票历史（二期）
└─ 数据与隐私 Data     导出数据、注销账号（二期）
```

实现要点：

- 复用一个 `SettingsTabs` + 各区块组件，放在 `components/settings/`；表单用现有 UI 组件（`components/ui/` 下的 input/button/card/select）。
- 保存成功后同步 `userStore`（name/avatar/locale），toast 提示（项目已有 Toaster）。
- 资料表单本地校验 + 服务端 zod 二次校验；提交期间禁用按钮防止重复提交。
- 头像：一期沿用 Google 头像（`avatar_url` 可编辑为任意 HTTPS URL 或清空回退 Google）；二期如需上传再走 R2 + 预签名上传。
- 空态：`free` 套餐时"订阅"Tab 显示升级引导，指向二期 checkout。

## 8. 权限、安全与合规

- **输入校验**：所有 API 用 zod（已在依赖中），不信任任何客户端字段。
- **SQL**：全部用 D1 预编译语句（`env.DB.prepare(...).bind(...)`），无字符串拼接。
- **敏感信息**：不落库 Google token；JWT 仅存缓存字段，不存隐私扩展字段。
- **Webhook**：二期必须校验 `stripe-signature` 头；`webhook_events.stripe_event_id` 唯一约束保证幂等。
- **限流**：`/api/auth/login`、`/api/me` PATCH 用已有 `@upstash/ratelimit` 限制频率。
- **合规**：隐私政策/服务条款页面已存在；二期提供数据导出与账号注销。
- **审计**：可选 `audit_logs` 表记录"修改资料、变更套餐、注销"等敏感操作（操作者、时间、变更前后）。

## 9. 分阶段实施计划

### Phase 1 — 用户系统 + 设置页（本次范围）

> ✅ **已实施（2026-08-10）**：D1 数据库已创建；`migrations/0001_users.sql` 已本地
> 应用；`functions/_lib/db.ts`、登录落库、`/api/me`（GET/PATCH）、`/settings`
> 页面与菜单入口均已实现并通过本地联调。剩余生产步骤：在 Cloudflare Pages
> 控制台绑定 D1 `DB`，执行 `wrangler d1 migrations apply linkedin-answer --remote`。

1. `wrangler d1 create linkedin-answer`，在 `wrangler.toml` 与 Cloudflare Pages 控制台配置 D1 binding（`DB`），本地 `.dev.vars` 同步。
2. 建 `migrations/0001_users.sql`（users + user_identities），`wrangler d1 migrations apply`。
3. `functions/_lib/db.ts`：D1 类型定义 + `findOrCreateUserByIdentity` / `getUserById` / `updateUser` 帮助函数。
4. 改造 `functions/api/auth/login.ts`（登录 upsert）与 `session.ts`（返回 `id`），`_lib/auth.ts` 的 `SessionUser` 增加内部 `id`。
5. 新增 `functions/api/me/index.ts`：GET/PATCH。
6. 新增 `/settings` 页面与 `components/settings/*`，更新 `PROTECTED_PATHS`（middleware + authClient）、`UserMenu` 入口。
7. 验收：登录后打开 `/settings` 可查看资料、修改保存后刷新仍在；未登录访问 `/settings` 跳登录；`/api/me` 无会话返回 401。

### Phase 2 — 订阅与计费（Stripe）

1. `migrations/0002_plans.sql` + seed；`0003_subscriptions.sql`。
2. Stripe 账号、`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 进环境变量（test mode 先行）。
3. `/api/billing/checkout`、`/api/billing/portal`、`/api/stripe/webhook`。
4. `getEntitlements(userId)` 接入 `/chat` 等业务入口。
5. `/settings` 订阅 Tab + 发票历史。

### Phase 3 — 管理与运营

管理员接口与页面、审计日志、导出/注销、Resend 邮件通知（欢迎、续费失败、发票）。

## 10. 验收标准（Phase 1）

- [ ] 登录后 D1 中产生唯一用户记录，重复登录不产生重复用户
- [ ] `/settings` 可查看并修改资料，修改结果落库、刷新不丢失
- [ ] 未登录访问 `/settings` 被重定向到 `/login`
- [ ] 登录方式新增（如 Apple/邮箱）时，同一人可合并到同一 `users.id`，订阅不丢
- [ ] 数据结构为订阅预留（`plans`/`subscriptions` 表存在，`users.stripe_customer_id` 可用）

## 11. 租户系统（2026-08-11 实施）

### 11.1 模型

```sql
tenants         id / name / slug(唯一) / avatar_url / plan(free|pro) /
                status(active|disabled) / is_personal / owner_id / 时间戳
tenant_members  (tenant_id, user_id) 复合主键 / role(owner|admin|member) /
                status(active|removed) / 时间戳
users.current_tenant_id  用户当前租户上下文（可空）
```

- **个人租户**：登录时 `ensureDefaultTenant()` 保证每个用户至少有一个可用
  租户；首次登录自动创建 `is_personal=1` 的个人租户并设为当前租户。
- **多租户**：用户可创建更多租户（团队工作区），并按邮箱邀请其他已注册
  用户加入；同一用户可属于多个租户，`users.current_tenant_id` 记录当前切换。
- 成员移除为软删除（`status='removed'`），重新邀请时 `upsertMember` 恢复。

### 11.2 权限规则

| 操作 | 允许角色 |
| --- | --- |
| 查看租户详情/成员、切换租户 | 任意有效成员 |
| 修改租户资料（name/avatar） | 租户 owner / admin |
| 邀请成员 | 租户 owner / admin（授予 admin 角色仅 owner） |
| 调整成员角色 | 仅 owner（owner 自身角色不可改） |
| 移除成员 | owner / admin 移除非 owner 成员；非 owner 可移除自己（退出） |
| 站点级用户/租户管理 | `users.role === 'admin'`（查库校验；禁止修改自己） |

### 11.3 API 一览

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/me` | GET | 资料 + `current_tenant_id` + `tenants[]`（含角色/成员数） |
| `/api/tenants` | GET / POST | 我的租户列表 / 创建租户（自动切换） |
| `/api/tenants/:id` | GET / PATCH | 详情（含成员）/ 更新资料 |
| `/api/tenants/:id/switch` | POST | 切换当前租户 |
| `/api/tenants/:id/members` | GET / POST | 成员列表 / 按邮箱添加成员 |
| `/api/tenants/:id/members/:userId` | PATCH / DELETE | 调整角色 / 移除成员 |
| `/api/admin/users` | GET | 用户列表（search/limit/offset） |
| `/api/admin/users/:id` | PATCH | 调整用户 role/status |
| `/api/admin/tenants` | GET | 租户列表（含 owner 邮箱/成员数） |
| `/api/admin/tenants/:id` | PATCH | 调整租户 name/status/plan |

### 11.4 前端

- `/settings` 新增 **Team** Tab（`components/settings/TeamSection.tsx`）：
  工作区列表与切换、创建工作区、当前工作区成员管理（邀请/角色/移除/退出）。
- `/admin`（`components/admin/AdminClient.tsx`，noIndex）：仅 `role=admin`
  可见，Users / Tenants 两个 Tab，支持搜索、角色/状态/套餐调整。
  中间件 `PROTECTED_PATHS` 负责登录态拦截，角色校验在 API 层查库完成。
- 会话 JWT 新增 `role` 缓存声明（仅供菜单显隐等 UI 用途；一切权限判断以
  服务端查库为准）。`UserMenu` / 移动端菜单为 admin 显示 Admin Console 入口。

### 11.5 迁移

- `migrations/0002_tenants.sql`：tenants / tenant_members 表 +
  `users.current_tenant_id` 列。
- 本地：`npx wrangler d1 migrations apply linkedin-answer --local`（已应用）。
- 生产：`npx wrangler d1 migrations apply linkedin-answer --remote`。
