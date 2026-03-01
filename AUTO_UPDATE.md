# LinkedIn Answer 自动更新任务

## 任务说明

自动监控并更新 `/Users/songchuan.zhou/Src/linkedin-answer` 仓库

## 仓库信息

- **路径**: `/Users/songchuan.zhou/Src/linkedin-answer`
- **GitHub**: https://github.com/billychou/linkedin-answer
- **类型**: Next.js 16 多语言博客/网站模板
- **包管理器**: pnpm@10.12.4

## 自动化任务清单

### 每日检查 (建议加入 HEARTBEAT.md)

```bash
# 1. 检查是否有远程更新
cd /Users/songchuan.zhou/Src/linkedin-answer
git fetch origin
git status

# 2. 如有更新，拉取并构建测试
git pull origin main
pnpm install
pnpm build
```

### 自动更新脚本

创建脚本 `/Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh`:

```bash
#!/bin/bash
set -e

REPO_DIR="/Users/songchuan.zhou/Src/linkedin-answer"
LOG_FILE="$REPO_DIR/logs/auto-update.log"

mkdir -p "$(dirname $LOG_FILE)"

echo "[$(date)] 开始自动更新检查..." >> $LOG_FILE

cd $REPO_DIR

# 检查是否有远程更新
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[$(date)] 发现更新，开始拉取..." >> $LOG_FILE
    
    # 拉取更新
    git pull origin main
    
    # 安装依赖
    pnpm install
    
    # 构建测试
    if pnpm build; then
        echo "[$(date)] 构建成功!" >> $LOG_FILE
        
        # 提交更新记录
        git add .
        git commit -m "chore: 自动更新 $(date +%Y-%m-%d)" || true
        git push origin main
        
        echo "[$(date)] 更新完成!" >> $LOG_FILE
    else
        echo "[$(date)] 构建失败，回滚更新" >> $LOG_FILE
        git reset --hard $LOCAL
    fi
else
    echo "[$(date)] 已是最新版本" >> $LOG_FILE
fi
```

## Cron 配置

```bash
# 每天凌晨 3 点检查更新
0 3 * * * /Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh

# 或每周一上午 9 点
0 9 * * 1 /Users/songchuan.zhou/Src/linkedin-answer/scripts/auto-update.sh
```

## OpenClaw 自动化配置

### 方式 1: 加入 HEARTBEAT.md

在 `/Users/songchuan.zhou/clawd/HEARTBEAT.md` 添加:

```markdown
## LinkedIn Answer 仓库检查 (每周一)

- 检查 `/Users/songchuan.zhou/Src/linkedin-answer` 是否有更新
- 如有更新，拉取并运行 `pnpm build` 验证
- 构建失败时通知我
```

### 方式 2: 使用 Cron Job

创建 cron 任务定期执行更新脚本。

## 手动触发命令

```bash
# 快速检查状态
cd /Users/songchuan.zhou/Src/linkedin-answer && git fetch && git status

# 拉取更新
cd /Users/songchuan.zhou/Src/linkedin-answer && git pull

# 构建验证
cd /Users/songchuan.zhou/Src/linkedin-answer && pnpm install && pnpm build
```

## 注意事项

1. **备份**: 自动更新前确保代码已提交
2. **测试**: 构建失败时自动回滚
3. **日志**: 所有操作记录到 `logs/auto-update.log`
4. **通知**: 构建失败时通过 OpenClaw 通知

## 依赖检查

定期检查并更新依赖:

```bash
cd /Users/songchuan.zhou/Src/linkedin-answer

# 检查过时依赖
pnpm outdated

# 更新 Next.js 和相关包
pnpm run update:next

# 更新所有依赖
pnpm update
```
