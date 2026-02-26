import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

const readme = `# AI Wedding Platform - 数据管理脚本

本目录包含用于管理 AI Wedding Platform 数据的各种脚本。

## 📋 脚本列表

### 数据查询与分析

- **\`query-data.ts\`** - 查询数据库中的 domains 和 templates 数据
- **\`check-wedding-data.ts\`** - 检查 wedding domain 的详细数据
- **\`wedding-analysis.ts\`** - 生成 wedding domain 深度分析报告
- **\`summary-report.ts\`** - 生成完整的平台数据总览报告

### 数据种子与修复

- **\`seed-all-domains.ts\`** - 为所有 domain 生成种子模板数据
- **\`fix-issues.ts\`** - 修复数据库中检测到的问题
  - 激活停用的 domain
  - 修正异常高价模板
  - 平衡各 domain 的模板数量

### 数据导出与备份

- **\`export-data.ts\`** - 导出所有数据到 JSON 文件并生成 Markdown 报告
  - 导出 domains, templates, model_configs, announcements
  - 生成统计数据
  - 创建 Markdown 格式的数据报告

## 🚀 使用方法

### 查询数据
\`\`\`bash
pnpm tsx scripts/query-data.ts
pnpm tsx scripts/check-wedding-data.ts
pnpm tsx scripts/wedding-analysis.ts
pnpm tsx scripts/summary-report.ts
\`\`\`

### 生成种子数据
\`\`\`bash
pnpm tsx scripts/seed-all-domains.ts
\`\`\`

### 修复问题
\`\`\`bash
pnpm tsx scripts/fix-issues.ts
\`\`\`

### 导出数据
\`\`\`bash
pnpm tsx scripts/export-data.ts
\`\`\`

导出的文件位于 \`scripts/exports/\` 目录：
- \`data-export-YYYY-MM-DD.json\` - JSON 格式的完整数据
- \`data-report-YYYY-MM-DD.md\` - Markdown 格式的数据报告

## 📊 当前数据状态

### Domains (8个)
- ✅ AI 婚纱照 (wedding) - 9 个模板，需要人脸检测
- ✅ AI 儿童照 (children) - 9 个模板
- ✅ AI 证件照 (id_photo) - 5 个模板
- ✅ AI 艺术照 (artistic) - 5 个模板
- ✅ AI 个人写真 (portrait) - 5 个模板
- ✅ AI 动漫头像 (anime) - 5 个模板
- ✅ AI 风景壁纸 (landscape) - 5 个模板
- ✅ AI 商品图 (product) - 5 个模板

### Templates (48个)
- 总计: 48 个模板
- 激活: 48 个
- 平均价格: 9.8 credits
- 价格区间: 5-15 credits

### 价格分布
- 5 credits: 5 个 (证件照)
- 6-10 credits: 34 个 (主流价格)
- 11-15 credits: 9 个 (高端模板)

## 🔧 维护建议

### 定期任务
1. **每周**: 运行 \`summary-report.ts\` 检查数据健康状况
2. **每月**: 运行 \`export-data.ts\` 备份数据
3. **新增 domain**: 使用 \`seed-all-domains.ts\` 模式添加初始模板

### 数据质量检查
- 确保所有模板都有预览图 (\`preview_image_url\`)
- 确保所有模板都有完整的 prompt 配置
- 定期检查价格策略是否合理
- 监控各 domain 的模板数量平衡

### 问题排查
如果发现数据问题：
1. 运行 \`summary-report.ts\` 查看 "潜在问题检测" 部分
2. 根据提示运行 \`fix-issues.ts\` 自动修复
3. 对于复杂问题，手动编写修复脚本

## 📝 脚本开发规范

### 文件命名
- 查询类: \`query-*.ts\`, \`check-*.ts\`
- 分析类: \`*-analysis.ts\`, \`*-report.ts\`
- 操作类: \`seed-*.ts\`, \`fix-*.ts\`, \`export-*.ts\`

### 代码结构
\`\`\`typescript
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // 脚本逻辑
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
\`\`\`

### 输出规范
- 使用 emoji 增强可读性 (📊 📝 ✅ ⚠️ 🔧)
- 使用表格和分隔线组织输出
- 关键操作前后输出确认信息
- 错误信息要清晰明确

## 🔗 相关文档

- [Prisma Schema](../prisma/schema.prisma)
- [Database Types](../app/types/database.ts)
- [Domain Types](../app/types/domain.ts)
- [Root CLAUDE.md](../CLAUDE.md)

---

*最后更新: 2026-02-26*
`;

const filepath = join(process.cwd(), 'scripts', 'README.md');
writeFileSync(filepath, readme, 'utf-8');
console.log(`✅ README.md 创建完成: ${filepath}`);
