#!/bin/bash

# 添加 3 个新域功能 - 自动化部署脚本

set -e  # 遇到错误立即退出

echo "=========================================="
echo "添加 3 个新域功能 - 自动化部署"
echo "=========================================="
echo ""

# 获取脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "项目根目录: $PROJECT_ROOT"
echo ""

# 步骤 1: 重命名模板种子脚本
echo "步骤 1/6: 重命名模板种子脚本..."
if [ -f "prisma/seed-new-templates-temp.ts" ]; then
    mv prisma/seed-new-templates-temp.ts prisma/seed-new-templates.ts
    echo "✅ 重命名成功: seed-new-templates-temp.ts -> seed-new-templates.ts"
else
    if [ -f "prisma/seed-new-templates.ts" ]; then
        echo "✅ 文件已存在: prisma/seed-new-templates.ts"
    else
        echo "❌ 错误: 找不到模板种子脚本文件"
        exit 1
    fi
fi
echo ""

# 步骤 2: 执行域种子脚本
echo "步骤 2/6: 执行域种子脚本..."
pnpm tsx prisma/seed-new-domains.ts
echo ""

# 步骤 3: 执行模板种子脚本
echo "步骤 3/6: 执行模板种子脚本..."
pnpm tsx prisma/seed-new-templates.ts
echo ""

# 步骤 4: 类型检查
echo "步骤 4/6: 运行 TypeScript 类型检查..."
pnpm typecheck
echo "✅ 类型检查通过"
echo ""

# 步骤 5: Lint 检查
echo "步骤 5/6: 运行 ESLint 检查..."
pnpm lint
echo "✅ Lint 检查通过"
echo ""

# 步骤 6: 验证数据库
echo "步骤 6/6: 验证数据库数据..."
echo ""

# 创建临时验证脚本
cat > /tmp/verify-domains.ts << 'EOF'
import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function verify() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // 验证域
  const domains = await prisma.domains.findMany({
    where: { slug: { in: ['maternity', 'graduation', 'couple'] } },
    orderBy: { slug: 'asc' },
  });

  console.log('✅ 新增域验证:');
  domains.forEach(d => {
    console.log(`   - ${d.name} (${d.slug}): icon=${d.icon}, color=${d.color}`);
  });

  if (domains.length !== 3) {
    console.error(`❌ 错误: 预期 3 个新域，实际找到 ${domains.length} 个`);
    process.exit(1);
  }

  // 验证模板
  const maternityTemplates = await prisma.templates.count({ where: { domain: 'maternity' } });
  const graduationTemplates = await prisma.templates.count({ where: { domain: 'graduation' } });
  const coupleTemplates = await prisma.templates.count({ where: { domain: 'couple' } });

  console.log('');
  console.log('✅ 新增模板验证:');
  console.log(`   - maternity: ${maternityTemplates} 个模板`);
  console.log(`   - graduation: ${graduationTemplates} 个模板`);
  console.log(`   - couple: ${coupleTemplates} 个模板`);

  const totalTemplates = maternityTemplates + graduationTemplates + coupleTemplates;
  if (totalTemplates !== 18) {
    console.error(`❌ 错误: 预期 18 个新模板，实际找到 ${totalTemplates} 个`);
    process.exit(1);
  }

  // 验证总域数
  const totalDomains = await prisma.domains.count({ where: { is_active: true } });
  console.log('');
  console.log(`✅ 总域数: ${totalDomains} 个（预期 11 个）`);

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error('验证失败:', e);
  process.exit(1);
});
EOF

# 运行验证脚本
pnpm tsx /tmp/verify-domains.ts

echo ""
echo "=========================================="
echo "✅ 部署成功！"
echo "=========================================="
echo ""
echo "下一步操作:"
echo "1. 启动开发服务器: pnpm dev"
echo "2. 访问 http://localhost:3000 验证前端显示"
echo "3. 查看执行指南: .claude/EXECUTION_GUIDE.md"
echo ""
echo "验证命令:"
echo "  curl http://localhost:3000/api/domains | jq '.data | length'"
echo "  curl http://localhost:3000/api/templates?domain=maternity | jq '.templates | length'"
echo ""
