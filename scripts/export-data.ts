import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('\n📦 开始导出数据...\n');

    // 1. 导出 Domains
    console.log('1️⃣  导出 Domains...');
    const domains = await prisma.domains.findMany({
      orderBy: { sort_order: 'asc' },
    });
    console.log(`   ✅ 导出 ${domains.length} 个 domains`);

    // 2. 导出 Templates
    console.log('2️⃣  导出 Templates...');
    const templates = await prisma.templates.findMany({
      orderBy: [{ domain: 'asc' }, { sort_order: 'asc' }],
    });
    console.log(`   ✅ 导出 ${templates.length} 个 templates`);

    // 3. 导出 Model Configs
    console.log('3️⃣  导出 Model Configs...');
    const modelConfigs = await prisma.model_configs.findMany({
      orderBy: { created_at: 'desc' },
    });
    console.log(`   ✅ 导出 ${modelConfigs.length} 个 model configs`);

    // 4. 导出 System Announcements
    console.log('4️⃣  导出 System Announcements...');
    const announcements = await prisma.system_announcements.findMany({
      orderBy: { published_at: 'desc' },
    });
    console.log(`   ✅ 导出 ${announcements.length} 个 announcements`);

    // 5. 统计数据
    console.log('5️⃣  收集统计数据...');
    const stats = {
      users: await prisma.users.count(),
      profiles: await prisma.profiles.count(),
      projects: await prisma.projects.count(),
      generations: await prisma.generations.count(),
      orders: await prisma.orders.count(),
      favorites: await prisma.favorites.count(),
      image_likes: await prisma.image_likes.count(),
      image_downloads: await prisma.image_downloads.count(),
      invite_events: await prisma.invite_events.count(),
    };
    console.log(`   ✅ 收集统计数据完成`);

    // 6. 生成导出文件
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        platform: 'ai-wedding',
      },
      stats,
      domains,
      templates,
      modelConfigs,
      announcements,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `data-export-${timestamp}.json`;
    const filepath = join(process.cwd(), 'scripts', 'exports', filename);

    // 确保目录存在
    const { mkdirSync } = await import('fs');
    const { dirname } = await import('path');
    try {
      mkdirSync(dirname(filepath), { recursive: true });
    } catch (e) {
      // 目录已存在
    }

    writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`\n✅ 数据导出完成: ${filepath}\n`);

    // 7. 生成 Markdown 报告
    console.log('6️⃣  生成 Markdown 报告...');
    const markdownReport = generateMarkdownReport(exportData);
    const mdFilename = `data-report-${timestamp}.md`;
    const mdFilepath = join(process.cwd(), 'scripts', 'exports', mdFilename);
    writeFileSync(mdFilepath, markdownReport, 'utf-8');
    console.log(`   ✅ Markdown 报告: ${mdFilepath}\n`);

    // 8. 显示摘要
    console.log('📊 【导出摘要】');
    console.log(`  导出时间: ${exportData.metadata.exportDate}`);
    console.log(`  Domains: ${domains.length} 个`);
    console.log(`  Templates: ${templates.length} 个`);
    console.log(`  Model Configs: ${modelConfigs.length} 个`);
    console.log(`  Announcements: ${announcements.length} 个`);
    console.log(`\n  用户数据:`);
    console.log(`    Users: ${stats.users}`);
    console.log(`    Projects: ${stats.projects}`);
    console.log(`    Generations: ${stats.generations}`);
    console.log(`    Orders: ${stats.orders}`);
    console.log(`    Favorites: ${stats.favorites}`);
    console.log(`    Likes: ${stats.image_likes}`);
    console.log(`    Downloads: ${stats.image_downloads}`);
    console.log(`    Invites: ${stats.invite_events}`);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateMarkdownReport(data: any): string {
  const { metadata, stats, domains, templates } = data;

  let md = `# AI Wedding Platform - 数据报告\n\n`;
  md += `**导出时间**: ${metadata.exportDate}\n`;
  md += `**版本**: ${metadata.version}\n\n`;

  md += `## 📊 统计概览\n\n`;
  md += `| 指标 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 用户总数 | ${stats.users} |\n`;
  md += `| 项目总数 | ${stats.projects} |\n`;
  md += `| 生成总数 | ${stats.generations} |\n`;
  md += `| 订单总数 | ${stats.orders} |\n`;
  md += `| 收藏总数 | ${stats.favorites} |\n`;
  md += `| 点赞总数 | ${stats.image_likes} |\n`;
  md += `| 下载总数 | ${stats.image_downloads} |\n`;
  md += `| 邀请总数 | ${stats.invite_events} |\n\n`;

  md += `## 🎨 Domains (${domains.length})\n\n`;
  md += `| 序号 | 名称 | Slug | 状态 | 人脸检测 | 模板数 |\n`;
  md += `|------|------|------|------|----------|--------|\n`;
  domains.forEach((d: any, i: number) => {
    const templateCount = templates.filter((t: any) => t.domain === d.slug && t.is_active).length;
    const status = d.is_active ? '✅' : '❌';
    const faceDetect = d.require_face_detection ? '✅' : '❌';
    md += `| ${i + 1} | ${d.name} | \`${d.slug}\` | ${status} | ${faceDetect} | ${templateCount} |\n`;
  });

  md += `\n## 📝 Templates 分布\n\n`;
  const templatesByDomain = templates.reduce((acc: any, t: any) => {
    if (!acc[t.domain]) acc[t.domain] = [];
    acc[t.domain].push(t);
    return acc;
  }, {});

  Object.entries(templatesByDomain).forEach(([domain, temps]: [string, any]) => {
    const domainInfo = domains.find((d: any) => d.slug === domain);
    const domainName = domainInfo?.name || domain;
    md += `\n### ${domainName} (${temps.length})\n\n`;
    md += `| 名称 | 分类 | 价格 | 状态 |\n`;
    md += `|------|------|------|------|\n`;
    temps.forEach((t: any) => {
      const status = t.is_active ? '✅' : '❌';
      md += `| ${t.name} | ${t.category} | ${t.price_credits} credits | ${status} |\n`;
    });
  });

  md += `\n## 💰 价格分析\n\n`;
  const activeTemplates = templates.filter((t: any) => t.is_active);
  const prices = activeTemplates.map((t: any) => t.price_credits);
  const avgPrice = (prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(1);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  md += `- **平均价格**: ${avgPrice} credits\n`;
  md += `- **最低价格**: ${minPrice} credits\n`;
  md += `- **最高价格**: ${maxPrice} credits\n`;
  md += `- **价格区间**: ${maxPrice - minPrice} credits\n\n`;

  md += `## 🏷️ Category 分布\n\n`;
  const categories = templates.reduce((acc: any, t: any) => {
    if (!acc[t.category]) acc[t.category] = 0;
    acc[t.category]++;
    return acc;
  }, {});

  md += `| 分类 | 数量 |\n`;
  md += `|------|------|\n`;
  Object.entries(categories)
    .sort((a: any, b: any) => b[1] - a[1])
    .forEach(([cat, count]) => {
      md += `| ${cat} | ${count} |\n`;
    });

  md += `\n---\n\n`;
  md += `*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`;

  return md;
}

main();
