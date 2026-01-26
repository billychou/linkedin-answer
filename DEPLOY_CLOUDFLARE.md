# Cloudflare 部署指南

## 问题说明

如果你遇到 `[ERROR] Missing entry-point to Worker script or to assets directory` 错误，这是因为 Wrangler 找不到部署入口点。

## 解决方案

### 方案一：使用 Cloudflare Pages（推荐）⭐

这是部署 Next.js 应用到 Cloudflare 的最佳方式。

#### 步骤：

1. **安装 Cloudflare Next.js 适配器**（如果需要 SSR 支持）：
   ```bash
   pnpm add -D @cloudflare/next-on-pages
   ```

2. **更新 `next.config.mjs`**：
   ```javascript
   import createNextIntlPlugin from "next-intl/plugin";
   const withNextIntl = createNextIntlPlugin();

   /** @type {import('next').NextConfig} */
   const nextConfig = {
     // ... 现有配置
     output: 'export', // 如果只需要静态导出
     // 或者使用 @cloudflare/next-on-pages 进行 SSR
   };

   export default withNextIntl(nextConfig);
   ```

3. **在 Cloudflare Dashboard 中部署**：
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 **Pages** → **Create a project**
   - 连接你的 GitHub 仓库
   - 配置构建设置：
     - **Build command**: `pnpm build`
     - **Build output directory**: `.next` 或 `out`（如果使用静态导出）
     - **Root directory**: `/`（项目根目录）
     - **Node.js version**: `20`

4. **环境变量**：
   - 在 Pages 项目设置中添加所需的环境变量

### 方案二：使用 Wrangler CLI（已创建配置文件）

如果你必须使用 Wrangler CLI 部署，我已经创建了 `wrangler.jsonc` 配置文件。

#### 使用方式：

1. **静态导出部署**（如果 Next.js 配置了 `output: 'export'`）：
   ```bash
   # 先构建
   pnpm build
   
   # 部署到 Pages
   npx wrangler pages deploy out
   ```

2. **使用适配器部署**（需要 SSR）：
   ```bash
   # 安装适配器
   pnpm add -D @cloudflare/next-on-pages
   
   # 构建
   pnpm build
   
   # 部署
   npx wrangler pages deploy .vercel/output/static
   ```

### 方案三：直接使用 Wrangler 命令指定入口点

如果配置文件不起作用，可以在命令中直接指定：

```bash
# 部署静态文件
npx wrangler pages deploy <构建输出目录> --project-name=linkedin-answer

# 或者部署 Worker（如果有入口点）
npx wrangler deploy src/index.ts --name=linkedin-answer
```

## 注意事项

1. **Next.js 16 与 Cloudflare**：
   - Next.js 默认是为 Node.js 环境设计的
   - 要在 Cloudflare 上运行，需要适配器或静态导出
   - 推荐使用 Cloudflare Pages 的自动集成

2. **API Routes**：
   - 如果使用 API Routes（如 `app/api/fetch-pinpoint/route.ts`），需要适配器支持
   - 静态导出不支持 API Routes

3. **环境变量**：
   - 确保在 Cloudflare Pages 设置中配置所有必要的环境变量

## 推荐流程

对于你的项目，我推荐：

1. 使用 **Cloudflare Pages** 通过 GitHub 集成部署
2. 如果需要 SSR，安装 `@cloudflare/next-on-pages` 适配器
3. 如果只需要静态站点，配置 `output: 'export'` 并部署 `out` 目录

## 相关资源

- [Cloudflare Pages Next.js 文档](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages](https://www.npmjs.com/package/@cloudflare/next-on-pages)
- [Wrangler 配置文档](https://developers.cloudflare.com/workers/wrangler/configuration/)
