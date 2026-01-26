# Cloudflare Pages 静态部署配置

本项目已配置为静态导出（SSG），部署到 Cloudflare Pages 时请按以下步骤配置：

## 在 Cloudflare Pages 控制台中的配置

### 1. 构建设置

- **框架预设**: 选择 "Next.js (Static HTML Export)" 或 "None"
- **构建命令**: `pnpm build` 或 `npm run build`
- **构建输出目录**: `out`
- **根目录**: `/` (项目根目录)
- **Node.js 版本**: `20`

### 2. 环境变量

如果需要，可以添加以下环境变量：
- `NODE_VERSION`: `20`

### 3. 部署命令 ⚠️ 重要

对于静态导出（SSG），**部署命令字段应该留空**。

如果系统要求必须填写（标记为"必需"），可以使用以下占位符命令：
```bash
echo "Static site deployment completed"
```

或者简单地留空，Cloudflare Pages 会自动：
1. 运行构建命令 (`pnpm build`)
2. 检测 `out` 目录
3. 自动部署静态文件

**重要**：不要使用以下命令：
- ❌ `npx wrangler deploy`
- ❌ `npx wrangler pages deploy`
- ❌ 任何其他 wrangler 命令

### 4. 不要使用以下命令

❌ **不要**使用以下命令作为部署命令：
- `npx wrangler deploy`
- `npx wrangler pages deploy`
- 任何其他 wrangler 命令

静态站点不需要 Workers 或任何运行时部署命令。

## 验证配置

部署成功后，你应该能够：
1. 访问你的域名
2. 看到静态网站正常运行
3. 所有路由都能正常工作

## 故障排除

如果遇到 "wrangler deploy" 错误：
1. 检查 Cloudflare Pages 控制台中的"部署命令"设置
2. 确保"部署命令"字段为空
3. 重新触发部署
