#!/bin/bash

# AI Wedding 项目部署脚本
# 用于在服务器上构建和启动项目

set -e

echo "================================================"
echo "开始部署 AI Wedding 项目"
echo "================================================"

if [ ! -f "package.json" ]; then
  echo "错误：未找到 package.json，请在项目根目录执行此脚本"
  exit 1
fi

echo ""
echo "步骤 1: 安装依赖..."
pnpm install --frozen-lockfile

echo ""
echo "步骤 2: 生成 Prisma Client..."
pnpm prisma generate

echo ""
echo "步骤 3: 构建 Next.js 项目..."
rm -rf .next
pnpm build

if [ ! -d ".next" ]; then
  echo "错误：构建失败，未找到 .next 目录"
  exit 1
fi
echo "构建成功"

echo ""
echo "步骤 4: 执行数据库迁移..."
pnpm prisma migrate deploy

echo ""
echo "步骤 5: 创建日志目录..."
mkdir -p logs

echo ""
echo "步骤 6: 重启 PM2 进程..."
pm2 stop ai-wedding 2>/dev/null || echo "没有运行中的进程"
pm2 delete ai-wedding 2>/dev/null || echo "没有需要删除的进程"
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "================================================"
echo "部署完成！"
echo "================================================"
echo ""
echo "常用命令："
echo "  pm2 logs ai-wedding     查看日志"
echo "  pm2 status              查看状态"
echo "  pm2 restart ai-wedding  重启应用"
echo "  pm2 stop ai-wedding     停止应用"
echo ""
