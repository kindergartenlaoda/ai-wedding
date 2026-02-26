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
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          AI Wedding Platform - 数据总览报告                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Domains 统计
    console.log('📊 【Domain 领域统计】');
    const domains = await prisma.domains.findMany({
      orderBy: { sort_order: 'asc' },
    });
    const activeDomains = domains.filter((d) => d.is_active);
    console.log(`  总计: ${domains.length} 个领域`);
    console.log(`  激活: ${activeDomains.length} 个 | 停用: ${domains.length - activeDomains.length} 个\n`);

    console.log('  领域列表:');
    domains.forEach((d, i) => {
      const status = d.is_active ? '✅' : '❌';
      const faceDetect = d.require_face_detection ? '👤' : '  ';
      console.log(`    ${i + 1}. ${status} ${faceDetect} ${d.name.padEnd(12)} (${d.slug})`);
    });

    // 2. Templates 统计
    console.log('\n\n📝 【Template 模板统计】');
    const allTemplates = await prisma.templates.findMany();
    const activeTemplates = allTemplates.filter((t) => t.is_active);
    console.log(`  总计: ${allTemplates.length} 个模板`);
    console.log(`  激活: ${activeTemplates.length} 个 | 停用: ${allTemplates.length - activeTemplates.length} 个\n`);

    const templatesByDomain = await prisma.templates.groupBy({
      by: ['domain'],
      where: { is_active: true },
      _count: { domain: true },
      _avg: { price_credits: true },
    });

    console.log('  按领域分布:');
    templatesByDomain
      .sort((a, b) => b._count.domain - a._count.domain)
      .forEach((t) => {
        const domainInfo = domains.find((d) => d.slug === t.domain);
        const domainName = domainInfo?.name || t.domain;
        const avgPrice = t._avg.price_credits?.toFixed(1) || '0';
        const bar = '█'.repeat(Math.ceil(t._count.domain / 2));
        console.log(`    ${domainName.padEnd(12)} ${bar} ${t._count.domain} 个 (均价: ${avgPrice} credits)`);
      });

    // 3. Categories 统计
    console.log('\n\n🏷️  【Category 分类统计】');
    const categories = await prisma.templates.groupBy({
      by: ['category', 'domain'],
      where: { is_active: true },
      _count: { category: true },
    });

    const categoryMap = categories.reduce((acc, c) => {
      if (!acc[c.domain]) acc[c.domain] = [];
      acc[c.domain].push({ category: c.category, count: c._count.category });
      return acc;
    }, {} as Record<string, Array<{ category: string; count: number }>>);

    Object.entries(categoryMap)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([domain, cats]) => {
        const domainInfo = domains.find((d) => d.slug === domain);
        const domainName = domainInfo?.name || domain;
        console.log(`  ${domainName}:`);
        cats.forEach((c) => {
          console.log(`    - ${c.category}: ${c.count} 个`);
        });
      });

    // 4. Pricing 统计
    console.log('\n\n💰 【Pricing 价格统计】');
    const priceStats = await prisma.templates.aggregate({
      where: { is_active: true },
      _avg: { price_credits: true },
      _min: { price_credits: true },
      _max: { price_credits: true },
    });
    console.log(`  平均价格: ${priceStats._avg.price_credits?.toFixed(1)} credits`);
    console.log(`  最低价格: ${priceStats._min.price_credits} credits`);
    console.log(`  最高价格: ${priceStats._max.price_credits} credits\n`);

    const priceRanges = [
      { range: '1-5', min: 1, max: 5 },
      { range: '6-10', min: 6, max: 10 },
      { range: '11-15', min: 11, max: 15 },
      { range: '16+', min: 16, max: 999 },
    ];

    console.log('  价格区间分布:');
    for (const r of priceRanges) {
      const count = await prisma.templates.count({
        where: {
          is_active: true,
          price_credits: { gte: r.min, lte: r.max },
        },
      });
      if (count > 0) {
        const bar = '▓'.repeat(Math.ceil(count / 2));
        console.log(`    ${r.range.padEnd(8)} credits: ${bar} ${count} 个`);
      }
    }

    // 5. Projects & Generations 统计
    console.log('\n\n🎨 【Projects & Generations 使用统计】');
    const projectCount = await prisma.projects.count();
    const generationCount = await prisma.generations.count();
    const userCount = await prisma.users.count();

    console.log(`  用户总数: ${userCount}`);
    console.log(`  项目总数: ${projectCount}`);
    console.log(`  生成总数: ${generationCount}`);

    if (projectCount > 0) {
      const projectsByDomain = await prisma.projects.groupBy({
        by: ['domain'],
        _count: { domain: true },
      });
      console.log('\n  项目按领域分布:');
      projectsByDomain.forEach((p) => {
        const domainInfo = domains.find((d) => d.slug === p.domain);
        const domainName = domainInfo?.name || p.domain;
        console.log(`    ${domainName}: ${p._count.domain} 个`);
      });
    }

    // 6. 潜在问题检测
    console.log('\n\n⚠️  【潜在问题检测】');
    const issues: string[] = [];

    // 检查停用 domain 但有激活模板
    for (const domain of domains) {
      if (!domain.is_active) {
        const activeTemplateCount = await prisma.templates.count({
          where: { domain: domain.slug, is_active: true },
        });
        if (activeTemplateCount > 0) {
          issues.push(`  ⚠️  ${domain.name} (${domain.slug}) 已停用，但仍有 ${activeTemplateCount} 个激活模板`);
        }
      }
    }

    // 检查模板数量不均衡
    const domainTemplateCounts = templatesByDomain.map((t) => t._count.domain);
    const maxCount = Math.max(...domainTemplateCounts);
    const minCount = Math.min(...domainTemplateCounts);
    if (maxCount > minCount * 2) {
      issues.push(`  ⚠️  模板分布不均: 最多 ${maxCount} 个，最少 ${minCount} 个 (差距 ${maxCount - minCount} 个)`);
    }

    // 检查异常高价模板
    const expensiveTemplates = await prisma.templates.findMany({
      where: { is_active: true, price_credits: { gte: 30 } },
      select: { name: true, price_credits: true, domain: true },
    });
    if (expensiveTemplates.length > 0) {
      expensiveTemplates.forEach((t) => {
        issues.push(`  ⚠️  异常高价模板: ${t.name} (${t.domain}) - ${t.price_credits} credits`);
      });
    }

    // 检查缺少 preview_image_url 的模板
    const noPreviewCount = await prisma.templates.count({
      where: { is_active: true, preview_image_url: null },
    });
    if (noPreviewCount > 0) {
      issues.push(`  ⚠️  ${noPreviewCount} 个模板缺少预览图片`);
    }

    if (issues.length === 0) {
      console.log('  ✅ 未发现明显问题');
    } else {
      issues.forEach((issue) => console.log(issue));
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    报告生成完成                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
