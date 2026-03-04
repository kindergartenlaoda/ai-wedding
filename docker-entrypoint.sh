#!/bin/sh
# Docker 容器启动脚本
# 用于在应用启动前执行数据库迁移和初始化

set -e

echo "=============================================="
echo "🚀 AI Wedding Container Starting"
echo "=============================================="

echo ""
echo "🔍 Step 1: Checking database connection..."
# 等待数据库就绪，最多 30 秒
timeout 30 sh -c '
  until npx prisma db execute --stdin <<EOF 2>/dev/null
SELECT 1;
EOF
  do
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 2
  done
' || {
  echo "❌ Database connection timeout! Check DATABASE_URL and PostgreSQL service."
  exit 1
}

echo "✅ Database connection established"

echo ""
echo "🗄️  Step 2: Running database migrations..."
npx prisma migrate deploy || {
  echo "❌ Migration failed! Check prisma/migrations/ directory."
  exit 1
}
echo "✅ Migrations applied successfully"

echo ""
echo "🌱 Step 3: Seeding initial data (if needed)..."
npx prisma db seed 2>&1 || {
  echo "⚠️  Seed skipped or already completed (this is usually fine)"
}

echo ""
echo "=============================================="
echo "✅ Database initialization completed"
echo "🚀 Starting Next.js application..."
echo "=============================================="
echo ""

# 执行传入的命令（例如 "node server.js"）
exec "$@"
