#!/bin/bash

# AI Wedding 项目部署脚本
# 用于在服务器上构建和启动项目
#
# 特性：
# - 前置检查（依赖、环境变量）
# - 自动备份旧版本
# - 构建失败自动回滚
# - 健康检查验证部署成功

set -euo pipefail  # 严格模式：遇到错误立即退出，未定义变量报错

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/api/health}"
HEALTH_CHECK_TIMEOUT=30
BACKUP_RETENTION=3  # 保留最近 3 个备份

# 日志函数
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 错误处理
cleanup_on_error() {
  log_error "部署失败，正在清理..."

  # 如果有备份，尝试恢复
  if [ -d ".next.backup.latest" ]; then
    log_warn "尝试恢复旧版本..."
    rm -rf .next
    mv .next.backup.latest .next

    # 重启服务
    pm2 restart ai-wedding 2>/dev/null || true
    log_info "已恢复到旧版本"
  fi

  exit 1
}

trap cleanup_on_error ERR

echo "================================================"
echo "🚀 AI Wedding 项目部署脚本"
echo "================================================"
echo ""

# ============================================================
# 步骤 0: 前置检查
# ============================================================
log_info "步骤 0: 前置检查..."

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  log_error "未找到 package.json，请在项目根目录执行此脚本"
  exit 1
fi

# 检查必需命令
for cmd in pnpm pm2 node; do
  if ! command -v $cmd &> /dev/null; then
    log_error "未安装 $cmd，请先安装"
    exit 1
  fi
done

# 检查必需环境变量
if [ ! -f ".env" ]; then
  log_error "未找到 .env 文件，请先配置环境变量"
  exit 1
fi

# 验证关键环境变量
source .env
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "IMAGE_API_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    log_error "缺少必需的环境变量: $var"
    exit 1
  fi
done

log_info "✅ 前置检查通过"
echo ""

# ============================================================
# 步骤 1: 安装依赖
# ============================================================
log_info "步骤 1: 安装依赖..."
pnpm install --frozen-lockfile || {
  log_error "依赖安装失败"
  exit 1
}
echo ""

# ============================================================
# 步骤 2: 生成 Prisma Client
# ============================================================
log_info "步骤 2: 生成 Prisma Client..."
pnpm prisma generate || {
  log_error "Prisma Client 生成失败"
  exit 1
}
echo ""

# ============================================================
# 步骤 3: 备份旧版本
# ============================================================
log_info "步骤 3: 备份旧版本..."

if [ -d ".next" ]; then
  BACKUP_NAME=".next.backup.$(date +%s)"
  mv .next "$BACKUP_NAME"
  ln -sf "$BACKUP_NAME" .next.backup.latest
  log_info "已备份到: $BACKUP_NAME"

  # 清理旧备份（保留最近 N 个）
  ls -dt .next.backup.* 2>/dev/null | tail -n +$((BACKUP_RETENTION + 1)) | xargs rm -rf 2>/dev/null || true
else
  log_warn "未找到旧版本，跳过备份"
fi
echo ""

# ============================================================
# 步骤 4: 构建 Next.js 项目
# ============================================================
log_info "步骤 4: 构建 Next.js 项目..."
pnpm build || {
  log_error "构建失败"
  cleanup_on_error
}

if [ ! -d ".next" ]; then
  log_error "构建失败，未找到 .next 目录"
  cleanup_on_error
fi

log_info "✅ 构建成功"
echo ""

# ============================================================
# 步骤 5: 执行数据库迁移
# ============================================================
log_info "步骤 5: 执行数据库迁移..."
pnpm prisma migrate deploy || {
  log_error "数据库迁移失败"
  cleanup_on_error
}
echo ""

# ============================================================
# 步骤 6: 创建日志目录
# ============================================================
log_info "步骤 6: 创建日志目录..."
mkdir -p logs
echo ""

# ============================================================
# 步骤 7: 重启 PM2 进程
# ============================================================
log_info "步骤 7: 重启 PM2 进程..."

# 优雅停止旧进程
if pm2 describe ai-wedding &>/dev/null; then
  log_info "停止旧进程..."
  pm2 stop ai-wedding
  pm2 delete ai-wedding
else
  log_warn "没有运行中的进程"
fi

# 启动新进程
log_info "启动新进程..."
pm2 start ecosystem.config.js
pm2 save

echo ""

# ============================================================
# 步骤 8: 健康检查
# ============================================================
log_info "步骤 8: 健康检查..."
log_info "等待服务启动（最多 ${HEALTH_CHECK_TIMEOUT} 秒）..."

for i in $(seq 1 $HEALTH_CHECK_TIMEOUT); do
  if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
    log_info "✅ 服务健康检查通过"

    # 清理备份
    rm -rf .next.backup.* 2>/dev/null || true

    echo ""
    echo "================================================"
    echo "✅ 部署成功！"
    echo "================================================"
    echo ""
    echo "服务信息："
    echo "  健康检查: $HEALTH_CHECK_URL"
    pm2 describe ai-wedding | grep -E "status|uptime|memory|cpu"
    echo ""
    echo "常用命令："
    echo "  pm2 logs ai-wedding     查看日志"
    echo "  pm2 status              查看状态"
    echo "  pm2 restart ai-wedding  重启应用"
    echo "  pm2 stop ai-wedding     停止应用"
    echo "  pm2 monit               实时监控"
    echo ""

    exit 0
  fi

  echo -n "."
  sleep 1
done

echo ""
log_error "健康检查超时，服务可能未正常启动"
log_info "查看日志: pm2 logs ai-wedding"
cleanup_on_error
