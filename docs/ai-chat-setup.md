# AI Chat（/api/chat/completions）配置说明

聊天补全端点运行在 Cloudflare Pages Functions（`functions/api/chat/completions.ts`）：
鉴权、限流、套餐配额扣减、历史窗口裁剪与会话持久化全部在服务端强制，
前端默认直连本站端点（`lib/chatAgent.ts`），对上游走 OpenAI 兼容协议（SSE 流式）。

## 必需环境变量

在 Cloudflare Pages 控制台（Settings → Environment variables）配置，
本地开发写入项目根目录 `.dev.vars`（勿提交）：

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `CHAT_API_KEY` | 是* | 上游模型 API Key。未设置时回退 `DASHSCOPE_API_KEY`（与 CI 抓取共用一把钥匙的便利项） |
| `CHAT_BASE_URL` | 否 | OpenAI 兼容基址，默认 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `CHAT_MODEL` | 否 | 模型名，默认 `qwen-plus` |

\* 两者都未配置时端点返回 503（前端展示"AI chat is being set up"），
不影响站点其余功能。

## 配额与计费

- 配额按用户时区的"天"计量（`usage_daily` 表，`functions/_lib/quota.ts`）。
- Free 每日 5 次、Pro 每日 100 次（`migrations/0003_billing.sql` seed）。
- 超限返回 429，前端提示升级；配额扣减发生在模型调用之前，失败不扣次。

## 前端模式

- 默认：`/api/chat/completions`（live）。
- `NEXT_PUBLIC_AGENT_API_URL=<url>`：改指外部 OpenAI 兼容接口。
- `NEXT_PUBLIC_AGENT_API_URL=mock`：本地模拟回复（离线 demo）。
- 静态导出下 `NEXT_PUBLIC_*` 在构建时内联，切换模式需重新构建。
