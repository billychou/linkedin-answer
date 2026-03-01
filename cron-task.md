# LinkedIn Answer 自动更新 Cron 任务

## 任务配置

```toml
# ~/clawd/cron/linkedin-answer-update.toml
name = "linkedin-answer-update"
schedule = "0 3 * * 1"  # 每周一凌晨 3 点
command = "/Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh"
workdir = "/Users/songchuan.zhou/Src/linkedin-answer"
enabled = true
```

## 安装 Cron 任务

```bash
# 方式 1: 使用 OpenClaw cron (推荐)
openclaw cron create \
  --name "linkedin-answer-update" \
  --schedule "0 3 * * 1" \
  --command "/Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh" \
  --workdir "/Users/songchuan.zhou/Src/linkedin-answer"

# 方式 2: 系统 crontab
crontab -e
# 添加：
# 0 3 * * 1 /Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh >> /Users/songchuan.zhou/Src/linkedin-answer/logs/cron.log 2>&1
```

## 可用调度选项

| 调度 | Cron 表达式 | 说明 |
|------|------------|------|
| 每日凌晨 | `0 3 * * *` | 每天 3:00 AM |
| 每周一 | `0 3 * * 1` | 周一 3:00 AM |
| 每 12 小时 | `0 */12 * * *` | 每 12 小时 |
| 工作日 | `0 9 * * 1-5` | 工作日 9:00 AM |

## 查看任务状态

```bash
# 查看 cron 任务列表
openclaw cron list

# 查看最近执行日志
openclaw cron logs linkedin-answer-update

# 手动触发一次
openclaw cron run linkedin-answer-update
```

## 环境变量

在 `.env` 或 cron 配置中添加:

```bash
# 通知配置
NOTIFY_CHANNEL=dingtalk
NOTIFY_ON_SUCCESS=false  # 成功时不通知
NOTIFY_ON_FAILURE=true   # 失败时通知
```

## 日志位置

- **更新日志**: `/Users/songchuan.zhou/Src/linkedin-answer/logs/auto-update.log`
- **Cron 日志**: `/Users/songchuan.zhou/Src/linkedin-answer/logs/cron.log`
