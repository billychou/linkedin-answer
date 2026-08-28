# 邮件订阅（回访通道）配置指南

每日答案摘要邮件链路：页脚表单 → `POST /api/newsletter/subscribe`（D1 落库 + 欢迎邮件）→ GitHub Actions 每日触发 `POST /api/newsletter/digest` → Resend 逐人发送（带一键退订链接）。

## 1. 应用数据库迁移

`migrations/0007_subscriptions.sql` 创建 `email_subscriptions` 表：

```bash
npx wrangler d1 execute linkedin-answer --remote \
  --file=migrations/0007_subscriptions.sql
```

本地开发（`wrangler pages dev` 使用本地 D1）：

```bash
npx wrangler d1 execute linkedin-answer --local \
  --file=migrations/0007_subscriptions.sql
```

## 2. Cloudflare Pages 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `RESEND_API_KEY` | 摘要/欢迎邮件 | 未配置时订阅仍成功，但邮件静默跳过 |
| `EMAIL_FROM` | 建议 | 如 `LinkedIn Answer Today <noreply@你的域名>`；域名需在 Resend 验证。未配置时退回沙箱域（只能发到自己账号邮箱） |
| `NEWSLETTER_CRON_SECRET` | 摘要端点 | 未配置时 `/api/newsletter/digest` 返回 503（端点关闭） |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 建议 | 订阅接口限流（10 次/小时/IP）；未配置时 fail-open |

## 3. GitHub 配置

- **Secret**：`NEWSLETTER_CRON_SECRET`（与 Pages 环境变量同值）
- **Variable**（可选）：`NEXT_PUBLIC_SITE_URL`，不配置时工作流默认请求 `https://linkedinanswer.today`

## 4. 触发时间

`.github/workflows/newsletter-digest.yml` 每日 **14:30 UTC**（美东上午，当日答案已全部发布后）触发；也支持 `workflow_dispatch` 手动重跑。端点按 `last_digest_date`（UTC 日期）去重：同一天重复触发不会重复发送；发送失败的订阅者不标记，下次触发自动补发。

## 5. 验证

```bash
# 订阅（本地）
curl -X POST http://localhost:8788/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","source":"footer"}'

# 手动触发摘要（本地，需先在 .dev.vars 配置 NEWSLETTER_CRON_SECRET）
curl -X POST http://localhost:8788/api/newsletter/digest \
  -H "x-cron-secret: <你的密钥>"

# 退订页（浏览器打开）
http://localhost:8788/api/newsletter/unsubscribe?token=<邮件中的 token>
```

## 合规提示

- 每封营销/摘要邮件都带一键退订链接（退订即时生效，链接长期有效）。
- 隐私政策若声明"不发送邮件营销"，启用本功能前请同步更新 `content/privacy-policy/*.mdx`。
