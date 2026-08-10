# Cloudflare Pages 部署完整方案

## 📋 项目分析

### 当前技术栈
- **框架**: Next.js 16.1.1 (App Router)
- **适配器**: @opennextjs/cloudflare v1.15.1
- **国际化**: next-intl v4.4.0
- **包管理器**: pnpm 10.12.4
- **Node.js**: 20.x

### 关键功能
- ✅ API Routes: `/api/fetch-pinpoint`, `/api/newsletter`
- ✅ 国际化路由 (i18n): 支持 en, zh, ja
- ✅ Middleware: next-intl 路由处理
- ✅ SSR/SSG: 混合渲染模式

## 🔧 Cloudflare Pages 构建环境

### 支持的构建环境
- **Node.js 版本**: 
  - Build System V3: Node.js 22.16.0 (默认)
  - Build System V2: Node.js 18.17.1
  - 可通过 `NODE_VERSION` 环境变量或 `.nvmrc` 文件指定
- **包管理器**: 
  - ✅ pnpm 10.x (完全支持)
  - ✅ npm
  - ✅ yarn
- **构建时间限制**: 20 分钟
- **构建输出大小限制**: 25 MB

## 🚀 部署方案

### 方案一：使用 OpenNext Cloudflare 适配器（推荐）⭐

这是最适合你项目的方案，支持 API Routes 和 SSR。

#### 步骤 1: 修复 Middleware 配置

由于 `proxy.ts` 需要转换为 Edge Middleware，创建 `middleware.ts`：

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// 明确指定 Edge Runtime（Cloudflare Workers 必需）
export const runtime = 'edge';

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/',
    '/(en|zh|ja)/:path*',
    '/((?!api|_next|_vercel|.*\\.|favicon.ico).*)'
  ]
};
```

#### 步骤 2: 更新 package.json 构建脚本

```json
{
  "scripts": {
    "build": "next build",
    "build:cf": "next build && opennextjs-cloudflare build",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

#### 步骤 3: 在 Cloudflare Pages Dashboard 配置

1. **访问 Cloudflare Dashboard**
   - 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 选择 **Pages** → **Create a project**

2. **连接 GitHub 仓库**
   - 选择你的 GitHub 仓库
   - 授权 Cloudflare 访问

3. **配置构建设置**
   
   **项目设置**:
   - **项目名称**: `linkedin-answer`
   - **生产分支**: `main` 或 `master`
   
   **构建设置**:
   - **Build command**: 
     ```bash
     pnpm install && pnpm run build:cf
     ```
     或者：
     ```bash
     pnpm install && next build && opennextjs-cloudflare build
     ```
   
   - **Build output directory**: `.open-next` (OpenNext 会自动处理)
   
   - **Root directory**: `/` (项目根目录)
   
   - **Node.js version**: `20` (在环境变量中设置 `NODE_VERSION=20`)

4. **环境变量配置**
   
   在 **Settings** → **Environment variables** 中添加：
   
   ```
   NODE_VERSION=20
   NODE_ENV=production
   ```
   
   以及你的应用所需的其他环境变量（如果有）

5. **构建系统版本**
   
   在 **Settings** → **Build & deployments** → **Build system version**:
   - 选择 **V3** (推荐，使用 Node.js 22)
   - 或使用 **V2** 并设置 `NODE_VERSION=20`

#### 步骤 4: 部署

1. **自动部署**: 推送到 GitHub 后自动触发构建
2. **手动部署**: 在 Dashboard 中点击 "Retry deployment"

### 方案二：静态导出（不推荐，会丢失 API Routes）

如果你的 API Routes 不是必需的，可以使用静态导出：

```javascript
// next.config.mjs
const nextConfig = {
  output: "export", // 启用静态导出
  images: {
    unoptimized: true,
  },
};
```

然后在 Cloudflare Pages 中：
- **Build command**: `pnpm install && pnpm build`
- **Build output directory**: `out`

⚠️ **注意**: 此方案会丢失所有 API Routes 功能。

## 🔍 故障排除

### 问题 1: Middleware 错误

**错误**: `Node.js middleware is not currently supported`

**解决方案**:
1. 确保使用 `middleware.ts` 而不是 `proxy.ts`
2. 添加 `export const runtime = 'edge'`
3. 删除 `proxy.ts` 文件（如果存在）

### 问题 2: 构建找不到 `.open-next/worker.js`

**错误**: `The entry-point file at ".open-next/worker.js" was not found`

**解决方案**:
1. 确保构建命令包含 `opennextjs-cloudflare build`
2. 检查构建日志，确认 OpenNext 构建成功
3. 本地测试：`pnpm run build:cf` 然后检查 `.open-next/worker.js` 是否存在

### 问题 3: pnpm 版本不匹配

**解决方案**:
1. 在项目根目录创建 `.npmrc`:
   ```
   engine-strict=true
   ```
2. 确保 `package.json` 中指定了 `packageManager`:
   ```json
   {
     "packageManager": "pnpm@10.12.4"
   }
   ```

### 问题 4: 构建超时

**解决方案**:
1. 优化构建时间：
   - 减少依赖项
   - 使用构建缓存
   - 检查是否有不必要的构建步骤
2. 考虑使用 Cloudflare Workers 的本地构建

## 📝 本地测试部署

在部署到 Cloudflare 之前，可以在本地测试：

```bash
# 1. 安装依赖
pnpm install

# 2. 运行完整构建
pnpm run build:cf

# 3. 检查输出
ls -la .open-next/worker.js
ls -la .open-next/assets/

# 4. 本地预览（可选）
pnpm run preview
```

## 🔐 环境变量管理

### 必需的环境变量

根据你的项目，可能需要以下环境变量：

```bash
# Node.js 版本
NODE_VERSION=20

# 应用环境
NODE_ENV=production

# 国际化（如果需要）
NEXT_PUBLIC_LOCALE_DETECTION=false

# API Keys（如果有）
# RESEND_API_KEY=...
# UPSTASH_REDIS_URL=...

# /chat 登录鉴权（Cloudflare Pages Functions 运行时环境变量）
# 与 NEXT_PUBLIC_GOOGLE_CLIENT_ID 相同，用于服务端校验 Google ID Token
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
# 会话签名密钥：openssl rand -base64 48 生成，必须与本地 .env 中一致
SESSION_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### 在 Cloudflare Pages 中设置

1. 进入项目 **Settings** → **Environment variables**
2. 为每个环境（Production, Preview）添加变量
3. 敏感信息使用 **Encrypt** 选项

> `/chat` 页面的登录访问控制由仓库根目录的 `functions/`（Cloudflare Pages
> Functions）实现：中间件拦截未登录请求并跳转 `/login`。部署时无需额外配置，
> Git 集成会自动识别 `functions/`；只需在 Pages 控制台配置上述
> `GOOGLE_CLIENT_ID` 与 `SESSION_SECRET` 两个运行时变量。

### 本地开发（可选）：dev-only 假登录

本地 `wrangler pages dev` 沙箱在受限网络下无法访问 Google JWKS，导致
`/api/auth/login` 必然返回 401。如需在本地完整测试登录流程，可在本地 `.env`
中设置（**切勿在 Pages 控制台设置，生产环境不可用**）：

```bash
DEV_FAKE_LOGIN=true
NEXT_PUBLIC_DEV_FAKE_LOGIN=true
```

重新 `pnpm build` 后，`/login` 页面会出现 "Dev login (local only)" 按钮，
直接签发本地测试会话（dev@example.com）；服务端 `/api/auth/dev-login` 仅在
`DEV_FAKE_LOGIN=true` 时可用，否则返回 404。

## 📊 构建优化建议

1. **使用构建缓存**
   - Cloudflare Pages 会自动缓存 `node_modules`
   - 确保 `.gitignore` 正确配置

2. **减少构建时间**
   - 使用 `pnpm` 的快速安装
   - 考虑使用 `turbo` 或 `nx` 进行增量构建（如果适用）

3. **监控构建**
   - 在 Cloudflare Dashboard 中查看构建日志
   - 设置构建通知

## 🎯 推荐配置总结

### package.json 脚本
```json
{
  "scripts": {
    "build": "next build",
    "build:cf": "next build && opennextjs-cloudflare build",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

### Cloudflare Pages 构建命令
```bash
pnpm install && pnpm run build:cf
```

### 环境变量
```
NODE_VERSION=20
NODE_ENV=production
```

### 文件结构
```
项目根目录/
├── middleware.ts          # Edge Middleware (必需)
├── open-next.config.ts    # OpenNext 配置
├── wrangler.jsonc         # Wrangler 配置
├── next.config.mjs        # Next.js 配置
└── package.json           # 包含 build:cf 脚本
```

## 📚 相关资源

- [OpenNext Cloudflare 文档](https://opennext.js.org/cloudflare/get-started)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [next-intl 文档](https://next-intl.dev/)
- [Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)

## ✅ 部署检查清单

- [ ] 创建 `middleware.ts` 并配置 Edge Runtime
- [ ] 删除或重命名 `proxy.ts`
- [ ] 更新 `package.json` 添加 `build:cf` 脚本
- [ ] 在 Cloudflare Pages 中配置构建命令
- [ ] 设置环境变量（特别是 `NODE_VERSION`）
- [ ] 本地测试构建：`pnpm run build:cf`
- [ ] 检查 `.open-next/worker.js` 是否生成
- [ ] 推送到 GitHub 触发自动部署
- [ ] 检查构建日志确认成功
- [ ] 测试生产环境功能（API Routes、i18n 等）
