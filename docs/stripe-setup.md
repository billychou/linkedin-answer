# Stripe 开闸清单（Billing 上线步骤）

计费代码已全部就绪（`functions/api/billing/*` + `functions/api/stripe/webhook.ts`），
当前处于"未配置"闸门状态：`/api/billing/checkout` 返回 503，前端提示
"Paid plans are launching soon"。按以下步骤开闸，无需改代码。

## 1. 创建 Stripe 商品与价格

套餐定义在 `migrations/0003_billing.sql`（价格与之一致）：

| plan id | 名称 | 价格 | 周期 |
| --- | --- | --- | --- |
| `pro_monthly` | Pro Monthly | $5.99 | 每月 |
| `pro_yearly` | Pro Yearly | $49.90 | 每年 |

在 Stripe Dashboard → Products 创建两个订阅类（Recurring）价格，
记下 `price_...` ID。先在 **Test mode** 建一套，验证通过后在 **Live mode** 再建。

## 2. 把 price ID 写回 D1

```bash
# 生产
npx wrangler d1 execute linkedin-answer --remote --command \
  "UPDATE plans SET stripe_price_id = 'price_xxx_monthly' WHERE id = 'pro_monthly';
   UPDATE plans SET stripe_price_id = 'price_xxx_yearly'  WHERE id = 'pro_yearly';"
```

本地联调用 `--local`。`checkout.ts` 要求 `stripe_price_id` 非 NULL 才放行下单。

## 3. 配置环境变量

Cloudflare Pages 控制台 → Settings → Environment variables
（本地写入根目录 `.dev.vars`，勿提交）：

| 变量 | 说明 |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...`（创建 Webhook 后生成） |
| `NEXT_PUBLIC_SITE_URL` | 站点正式域名（Checkout 回跳用） |

## 4. 配置 Webhook

Stripe Dashboard → Developers → Webhooks，端点：

```
https://<你的域名>/api/stripe/webhook
```

必须订阅的事件（处理逻辑见 `functions/api/stripe/webhook.ts`）：

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.deleted`

签名密钥填入 `STRIPE_WEBHOOK_SECRET`。

## 5. 验证（Test mode）

1. 用测试账号登录 → /pricing → 点击 Upgrade，应跳转 Stripe Checkout。
2. 用测试卡 `4242 4242 4242 4242`（任意未来日期/CVC）完成支付。
3. 回跳 `/settings?tab=subscription&checkout=success`，确认显示 Pro 生效。
4. `/api/billing/quota` 应返回 `limit: 100`；AI 聊天配额随之放宽。
5. 在 Stripe 取消订阅（period end），确认 `customer.subscription.updated`
   后 D1 订阅状态同步、期末后回落 Free。

## 6. 上线切换

验证通过后：切换为 Live mode 的 key/price/webhook，重复步骤 2–4。

## 故障排查

- `Billing is not configured yet`（503）→ 缺 `STRIPE_SECRET_KEY`。
- `Plan is not available for purchase`（400）→ 该 plan 的
  `stripe_price_id` 仍为 NULL。
- Webhook 500 / 签名错误 → 核对 `STRIPE_WEBHOOK_SECRET` 与所选事件。
- 回跳异常 → 核对 `NEXT_PUBLIC_SITE_URL`（未配置时回退请求 Origin）。
