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
    console.log('║          跨 Domain 对比分析报告                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. 获取所有 domains
    const domains = await prisma.domains.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });

    // 2. 获取所有模板
    const templates = await prisma.templates.findMany({
      where: { is_active: true },
    });

    // 3. 按 domain 分组统计
    const domainStats = await Promise.all(
      domains.map(async (domain) => {
        const domainTemplates = templates.filter((t) => t.domain === domain.slug);
        const prices = domainTemplates.map((t) => t.price_credits);
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        const categories = [...new Set(domainTemplates.map((t) => t.category))];

        const projectCount = await prisma.projects.count({
          where: { domain: domain.slug },
        });

        const generationCount = await prisma.generations.count({
          where: { domain: domain.slug },
        });

        return {
          domain: domain.slug,
          name: domain.name,
          icon: domain.icon,
          requireFaceDetection: domain.require_face_detection,
          templateCount: domainTemplates.length,
          categoryCount: categories.length,
          avgPrice: avgPrice.toFixed(1),
          minPrice,
          maxPrice,
          priceRange: maxPrice - minPrice,
          projectCount,
          generationCount,
          usageRate: projectCount > 0 ? (generationCount / projectCount).toFixed(1) : '0',
        };
      })
    );

    // 4. 显示对比表格
    console.log('📊 【Domain 综合对比】\n');
    console.log('┌─────────────┬────────┬──────┬──────────┬──────────┬────────┬────────┬──────────┐');
    console.log('│ Domain      │ 模板数 │ 分类 │ 均价     │ 价格区间 │ 项目数 │ 生成数 │ 人脸检测 │');
    console.log('├─────────────┼────────┼──────┼──────────┼──────────┼────────┼────────┼──────────┤');

    domainStats.forEach((stat) => {
      const faceDetect = stat.requireFaceDetection ? '✅' : '  ';
      console.log(
        `│ ${stat.name.padEnd(11)} │ ${String(stat.templateCount).padStart(6)} │ ${String(stat.categoryCount).padStart(4)} │ ${String(stat.avgPrice).padStart(8)} │ ${String(stat.priceRange).padStart(8)} │ ${String(stat.projectCount).padStart(6)} │ ${String(stat.generationCount).padStart(6)} │ ${faceDetect}       │`
      );
    });

    console.log('└─────────────┴────────┴──────┴──────────┴──────────┴────────┴────────┴──────────┘\n');

    // 5. 模板数量排名
    console.log('🏆 【模板数量排名】\n');
    const sortedByTemplates = [...domainStats].sort((a, b) => b.templateCount - a.templateCount);
    sortedByTemplates.forEach((stat, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      const bar = '█'.repeat(Math.ceil(stat.templateCount / 2));
      console.log(`  ${medal} ${stat.name.padEnd(12)} ${bar} ${stat.templateCount} 个`);
    });

    // 6. 价格策略对比
    console.log('\n\n💰 【价格策略对比】\n');
    const sortedByPrice = [...domainStats].sort((a, b) => parseFloat(b.avgPrice) - parseFloat(a.avgPrice));
    sortedByPrice.forEach((stat) => {
      const priceBar = '▓'.repeat(Math.ceil(parseFloat(stat.avgPrice)));
      console.log(
        `  ${stat.name.padEnd(12)} ${priceBar} ${stat.avgPrice} credits (${stat.minPrice}-${stat.maxPrice})`
      );
    });

    // 7. 使用率对比
    console.log('\n\n📈 【使用率对比】\n');
    const sortedByUsage = [...domainStats].sort((a, b) => b.generationCount - a.generationCount);
    sortedByUsage.forEach((stat) => {
      if (stat.generationCount > 0) {
        const usageBar = '●'.repeat(Math.min(stat.generationCount, 20));
        console.log(
          `  ${stat.name.padEnd(12)} ${usageBar} ${stat.generationCount} 次生成 (${stat.projectCount} 项目)`
        );
      } else {
        console.log(`  ${stat.name.padEnd(12)} ○ 暂无使用数据`);
      }
    });

    // 8. 分类多样性对比
    console.log('\n\n🏷️  【分类多样性对比】\n');
    const sortedByCategories = [...domainStats].sort((a, b) => b.categoryCount - a.categoryCount);
    sortedByCategories.forEach((stat) => {
      const diversityBar = '◆'.repeat(stat.categoryCount);
      const diversityScore = ((stat.categoryCount / stat.templateCount) * 100).toFixed(0);
      console.log(
        `  ${stat.name.padEnd(12)} ${diversityBar} ${stat.categoryCount} 个分类 (多样性: ${diversityScore}%)`
      );
    });

    // 9. 特殊功能标记
    console.log('\n\n🔧 【特殊功能配置】\n');
    const withFaceDetection = domainStats.filter((s) => s.requireFaceDetection);
    const withoutFaceDetection = domainStats.filter((s) => !s.requireFaceDetection);

    console.log(`  需要人脸检测 (${withFaceDetection.length}):`);
    withFaceDetection.forEach((stat) => {
      console.log(`    ✅ ${stat.name}`);
    });

    console.log(`\n  不需要人脸检测 (${withoutFaceDetection.length}):`);
    withoutFaceDetection.forEach((stat) => {
      console.log(`    ○ ${stat.name}`);
    });

    // 10. 综合评分
    console.log('\n\n⭐ 【综合评分】\n');
    const scoredDomains = domainStats.map((stat) => {
      // 评分标准:
      // - 模板数量 (30%): 越多越好
      // - 分类多样性 (20%): 越多越好
      // - 价格合理性 (20%): 接近平均价格越好
      // - 使用率 (30%): 越高越好

      const maxTemplates = Math.max(...domainStats.map((s) => s.templateCount));
      const maxCategories = Math.max(...domainStats.map((s) => s.categoryCount));
      const avgPriceAll = domainStats.reduce((sum, s) => sum + parseFloat(s.avgPrice), 0) / domainStats.length;
      const maxGenerations = Math.max(...domainStats.map((s) => s.generationCount));

      const templateScore = (stat.templateCount / maxTemplates) * 30;
      const categoryScore = (stat.categoryCount / maxCategories) * 20;
      const priceScore = (1 - Math.abs(parseFloat(stat.avgPrice) - avgPriceAll) / avgPriceAll) * 20;
      const usageScore = maxGenerations > 0 ? (stat.generationCount / maxGenerations) * 30 : 0;

      const totalScore = templateScore + categoryScore + priceScore + usageScore;

      return {
        ...stat,
        score: totalScore.toFixed(1),
      };
    });

    const sortedByScore = scoredDomains.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    sortedByScore.forEach((stat, i) => {
      const stars = '⭐'.repeat(Math.ceil(parseFloat(stat.score) / 20));
      const rank = i + 1;
      console.log(`  ${String(rank).padStart(2)}. ${stat.name.padEnd(12)} ${stars} ${stat.score} 分`);
    });

    // 11. 改进建议
    console.log('\n\n💡 【改进建议】\n');
    const suggestions: string[] = [];

    // 检查模板数量不足的 domain
    const avgTemplateCount = domainStats.reduce((sum, s) => sum + s.templateCount, 0) / domainStats.length;
    const lowTemplateDomains = domainStats.filter((s) => s.templateCount < avgTemplateCount * 0.8);
    if (lowTemplateDomains.length > 0) {
      suggestions.push(
        `  📝 模板数量不足: ${lowTemplateDomains.map((s) => s.name).join(', ')} 需要增加模板`
      );
    }

    // 检查分类单一的 domain
    const lowCategoryDomains = domainStats.filter((s) => s.categoryCount < 3);
    if (lowCategoryDomains.length > 0) {
      suggestions.push(
        `  🏷️  分类单一: ${lowCategoryDomains.map((s) => s.name).join(', ')} 需要增加分类多样性`
      );
    }

    // 检查价格异常的 domain
    const avgPriceAll = domainStats.reduce((sum, s) => sum + parseFloat(s.avgPrice), 0) / domainStats.length;
    const highPriceDomains = domainStats.filter((s) => parseFloat(s.avgPrice) > avgPriceAll * 1.3);
    const lowPriceDomains = domainStats.filter((s) => parseFloat(s.avgPrice) < avgPriceAll * 0.7);
    if (highPriceDomains.length > 0) {
      suggestions.push(`  💰 价格偏高: ${highPriceDomains.map((s) => s.name).join(', ')} 可能影响转化率`);
    }
    if (lowPriceDomains.length > 0) {
      suggestions.push(`  💰 价格偏低: ${lowPriceDomains.map((s) => s.name).join(', ')} 可以适当提价`);
    }

    // 检查无使用数据的 domain
    const noUsageDomains = domainStats.filter((s) => s.generationCount === 0);
    if (noUsageDomains.length > 0) {
      suggestions.push(
        `  📊 无使用数据: ${noUsageDomains.map((s) => s.name).join(', ')} 需要推广或优化`
      );
    }

    // 检查人脸检测配置
    const shouldHaveFaceDetection = ['children', 'portrait', 'id_photo'];
    const missingFaceDetection = domainStats.filter(
      (s) => shouldHaveFaceDetection.includes(s.domain) && !s.requireFaceDetection
    );
    if (missingFaceDetection.length > 0) {
      suggestions.push(
        `  🔧 建议启用人脸检测: ${missingFaceDetection.map((s) => s.name).join(', ')}`
      );
    }

    if (suggestions.length === 0) {
      console.log('  ✅ 所有 domain 配置均衡，无明显问题');
    } else {
      suggestions.forEach((s) => console.log(s));
    }

    // 12. 总结
    console.log('\n\n📋 【总结】\n');
    const totalTemplates = domainStats.reduce((sum, s) => sum + s.templateCount, 0);
    const totalProjects = domainStats.reduce((sum, s) => sum + s.projectCount, 0);
    const totalGenerations = domainStats.reduce((sum, s) => sum + s.generationCount, 0);
    const avgPriceOverall = (
      domainStats.reduce((sum, s) => sum + parseFloat(s.avgPrice), 0) / domainStats.length
    ).toFixed(1);

    console.log(`  • 总计 ${domains.length} 个激活的 domain`);
    console.log(`  • 总计 ${totalTemplates} 个激活的模板`);
    console.log(`  • 平均每个 domain ${(totalTemplates / domains.length).toFixed(1)} 个模板`);
    console.log(`  • 平台平均价格 ${avgPriceOverall} credits`);
    console.log(`  • 总计 ${totalProjects} 个项目，${totalGenerations} 次生成`);
    console.log(`  • 最受欢迎: ${sortedByUsage[0].name} (${sortedByUsage[0].generationCount} 次生成)`);
    console.log(`  • 综合评分最高: ${sortedByScore[0].name} (${sortedByScore[0].score} 分)`);

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    对比分析完成                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
