# Cloudflare Pages 部署配置指南

## 问题诊断

如果遇到错误：`The entry-point file at ".open-next/worker.js" was not found`

这是因为 Cloudflare Pages 的构建命令配置不正确。使用 `@opennextjs/cloudflare` 适配器时，需要先运行 `next build`，然后运行 `opennextjs-cloudflare build`。

## 解决方案

### 在 Cloudflare Pages Dashboard 中配置

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入你的 Pages 项目设置
3. 进入 **Settings** → **Builds & deployments**
4. 配置以下设置：

#### 构建配置

- **Build command**: 
  ```bash
  pnpm install && pnpm run build:cf
  ```
  或者：
  ```bash
  pnpm install && next build && opennextjs-cloudflare build
  ```

- **Build output directory**: `.open-next`（不需要设置，OpenNext 会自动处理）

- **Root directory**: `/`（项目根目录）

- **Node.js version**: `20`

#### 环境变量

确保在 **Settings** → **Environment variables** 中添加所有必要的环境变量。

### 本地测试构建

在部署前，可以在本地测试构建流程：

```bash
# 安装依赖
pnpm install

# 运行完整构建（Next.js + OpenNext）
pnpm run build:cf

# 检查 .open-next 目录是否生成
ls -la .open-next/

# 应该看到 worker.js 文件
ls -la .open-next/worker.js
```

### 使用 Wrangler 本地部署测试

```bash
# 构建
pnpm run build:cf

# 使用 wrangler 部署（需要先登录）
npx wrangler pages deploy .open-next --project-name=linkedin-answer
```

## 构建流程说明

使用 `@opennextjs/cloudflare` 的完整构建流程：

1. **`next build`**: 构建 Next.js 应用，生成 `.next` 目录
2. **`opennextjs-cloudflare build`**: 将 Next.js 构建产物转换为 Cloudflare Workers 格式，生成 `.open-next` 目录
   - `.open-next/worker.js` - Worker 入口文件
   - `.open-next/assets/` - 静态资源目录

## 重要提示

1. **不要使用 `output: "export"`**: 如果使用 OpenNext 适配器，不要在 `next.config.mjs` 中启用静态导出，因为 OpenNext 需要 SSR 支持。

2. **API Routes 支持**: OpenNext 适配器支持 Next.js API Routes，所以你的 `app/api/*` 路由可以正常工作。

3. **构建时间**: OpenNext 构建可能需要较长时间，请耐心等待。

## 故障排除

### 如果构建仍然失败

1. **检查 `.open-next` 目录是否生成**:
   ```bash
   ls -la .open-next/
   ```

2. **检查构建日志**: 在 Cloudflare Pages 的构建日志中查看详细错误信息

3. **本地测试**: 先在本地运行 `pnpm run build:cf` 确保构建成功

4. **清理缓存**: 如果问题持续，尝试清理构建缓存：
   ```bash
   rm -rf .next .open-next node_modules/.cache
   pnpm install
   pnpm run build:cf
   ```

## 相关资源

- [OpenNext Cloudflare 文档](https://github.com/cloudflare/next-on-pages)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
