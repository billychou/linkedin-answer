#!/bin/bash
set -e

REPO_DIR="/Users/songchuan.zhou/Src/linkedin-answer"
LOG_FILE="$REPO_DIR/logs/auto-update.log"
NOTIFY_CHANNEL="dingtalk"

mkdir -p "$(dirname $LOG_FILE)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
    echo "$1"
}

log "=========================================="
log "开始自动更新检查..."

cd $REPO_DIR

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    log "⚠️  检测到未提交的更改，跳过自动更新"
    log "请先提交或暂存本地更改"
    exit 0
fi

# 检查是否有远程更新
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    log "📥 发现更新，开始拉取..."
    log "本地版本：$LOCAL"
    log "远程版本：$REMOTE"
    
    # 拉取更新
    git pull origin main
    
    # 安装依赖
    log "📦 安装依赖..."
    pnpm install
    
    # 类型检查
    log "🔍 运行类型检查..."
    if ! pnpm run type-check 2>/dev/null; then
        log "⚠️  类型检查有警告，继续构建..."
    fi
    
    # 构建测试
    log "🔨 开始构建..."
    if pnpm build; then
        log "✅ 构建成功!"
        
        # 记录更新日志
        git log --oneline -5 >> $LOG_FILE
        
        log "🎉 更新完成!"
        
        # 可选：发送通知
        # openclaw message send --channel $NOTIFY_CHANNEL --message "✅ linkedin-answer 自动更新成功"
        
    else
        log "❌ 构建失败，回滚更新..."
        git reset --hard $LOCAL
        log "🔙 已回滚到版本：$LOCAL"
        
        # 发送失败通知
        # openclaw message send --channel $NOTIFY_CHANNEL --message "❌ linkedin-answer 自动更新失败，已回滚"
        
        exit 1
    fi
else
    log "✅ 已是最新版本"
    log "当前版本：$LOCAL"
fi

log "=========================================="
