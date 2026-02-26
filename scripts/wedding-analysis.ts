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
    console.log('║            Wedding Domain 深度分析报告                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Wedding Domain 基本信息
    console.log('📋 【Wedding Domain 基本信息】');
    const weddingDomain = await prisma.domains.findUnique({
      where: { slug: 'wedding' },
    });
    if (weddingDomain) {
      console.log(`  名称: ${weddingDomain.name}`);
      console.log(`  描述: ${weddingDomain.description}`);
      console.log(`  图标: ${weddingDomain.icon}`);
      console.log(`  颜色: ${weddingDomain.color}`);
      console.log(`  状态: ${weddingDomain.is_active ? '✅ 激活' : '❌ 停用'}`);
      console.log(`  人脸检测: ${weddingDomain.require_face_detection ? '✅ 需要' : '❌ 不需要'}`);
      console.log(`  排序: ${weddingDomain.sort_order}`);
    }

    // 2. Wedding Templates 详细列表
    console.log('\n\n📝 【Wedding Templates 详细列表】');
    const weddingTemplates = await prisma.templates.findMany({
      where: { domain: 'wedding', is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });

    console.log(`  总计: ${weddingTemplates.length} 个模板\n`);

    weddingTemplates.forEach((t, i) => {
      console.log(`  [${i + 1}] ${t.name}`);
      console.log(`      分类: ${t.category}`);
      console.log(`      价格: ${t.price_credits} credits`);
      console.log(`      排序: ${t.sort_order}`);
      console.log(`      ID: ${t.id}`);

      // 解析 prompt_config
      const promptConfig = t.prompt_config as any;
      if (promptConfig?.basePrompt) {
        console.log(`      基础提示词: ${promptConfig.basePrompt.substring(0, 60)}...`);
      }
      if (promptConfig?.styleModifiers && Array.isArray(promptConfig.styleModifiers) && promptConfig.styleModifiers.length > 0) {
        console.log(`      风格修饰: ${promptConfig.styleModifiers.join(', ')}`);
      }

      // 解析 prompt_list
      const promptList = t.prompt_list as any;
      if (Array.isArray(promptList) && promptList.length > 0) {
        console.log(`      提示词列表: ${promptList.length} 条`);
        console.log(`        - ${promptList[0].substring(0, 80)}...`);
      }

      console.log('');
    });

    // 3. Category 分析
    console.log('\n📊 【Category 分类分析】');
    const categories = await prisma.templates.groupBy({
      by: ['category'],
      where: { domain: 'wedding', is_active: true },
      _count: { category: true },
      _avg: { price_credits: true },
    });

    categories
      .sort((a, b) => b._count.category - a._count.category)
      .forEach((c) => {
        const avgPrice = c._avg.price_credits?.toFixed(1) || '0';
        console.log(`  ${c.category.padEnd(12)} - ${c._count.category} 个模板 (均价: ${avgPrice} credits)`);
      });

    // 4. 价格分析
    console.log('\n\n💰 【价格策略分析】');
    const priceStats = await prisma.templates.aggregate({
      where: { domain: 'wedding', is_active: true },
      _avg: { price_credits: true },
      _min: { price_credits: true },
      _max: { price_credits: true },
    });

    console.log(`  平均价格: ${priceStats._avg.price_credits?.toFixed(1)} credits`);
    console.log(`  最低价格: ${priceStats._min.price_credits} credits`);
    console.log(`  最高价格: ${priceStats._max.price_credits} credits`);
    console.log(`  价格区间: ${priceStats._max.price_credits! - priceStats._min.price_credits!} credits\n`);

    const priceDistribution = [
      { range: '5-10', count: await prisma.templates.count({ where: { domain: 'wedding', is_active: true, price_credits: { gte: 5, lte: 10 } } }) },
      { range: '11-15', count: await prisma.templates.count({ where: { domain: 'wedding', is_active: true, price_credits: { gte: 11, lte: 15 } } }) },
      { range: '16-20', count: await prisma.templates.count({ where: { domain: 'wedding', is_active: true, price_credits: { gte: 16, lte: 20 } } }) },
    ];

    console.log('  价格分布:');
    priceDistribution.forEach((p) => {
      if (p.count > 0) {
        const bar = '▓'.repeat(p.count);
        console.log(`    ${p.range.padEnd(8)} credits: ${bar} ${p.count} 个`);
      }
    });

    // 5. 使用统计
    console.log('\n\n📈 【使用统计】');
    const projectCount = await prisma.projects.count({
      where: { domain: 'wedding' },
    });
    const generationCount = await prisma.generations.count({
      where: { domain: 'wedding' },
    });

    console.log(`  项目数: ${projectCount}`);
    console.log(`  生成数: ${generationCount}`);

    if (generationCount > 0) {
      const generationsByTemplate = await prisma.generations.groupBy({
        by: ['template_id'],
        where: { domain: 'wedding', template_id: { not: null } },
        _count: { template_id: true },
      });

      console.log('\n  热门模板 (按使用次数):');
      for (const g of generationsByTemplate.sort((a, b) => b._count.template_id - a._count.template_id).slice(0, 5)) {
        const template = await prisma.templates.findUnique({
          where: { id: g.template_id! },
          select: { name: true },
        });
        console.log(`    ${template?.name || 'Unknown'}: ${g._count.template_id} 次`);
      }
    }

    // 6. Prompt 策略分析
    console.log('\n\n🎨 【Prompt 策略分析】');
    const promptStrategies = weddingTemplates.map((t) => {
      const config = t.prompt_config as any;
      const list = t.prompt_list as any;
      return {
        name: t.name,
        hasBasePrompt: !!config?.basePrompt,
        hasStyleModifiers: !!(config?.styleModifiers && Array.isArray(config.styleModifiers) && config.styleModifiers.length > 0),
        promptListLength: Array.isArray(list) ? list.length : 0,
      };
    });

    const withBasePrompt = promptStrategies.filter((p) => p.hasBasePrompt).length;
    const withStyleModifiers = promptStrategies.filter((p) => p.hasStyleModifiers).length;
    const avgPromptListLength = promptStrategies.reduce((sum, p) => sum + p.promptListLength, 0) / promptStrategies.length;

    console.log(`  使用 basePrompt: ${withBasePrompt}/${weddingTemplates.length} 个`);
    console.log(`  使用 styleModifiers: ${withStyleModifiers}/${weddingTemplates.length} 个`);
    console.log(`  平均 prompt_list 长度: ${avgPromptListLength.toFixed(1)} 条`);

    // 7. 建议
    console.log('\n\n💡 【优化建议】');
    const suggestions: string[] = [];

    // 检查价格策略
    if (priceStats._max.price_credits! > 15) {
      suggestions.push('  ⚠️  存在高价模板 (>15 credits)，建议评估性价比');
    }

    // 检查分类平衡
    const maxCategoryCount = Math.max(...categories.map((c) => c._count.category));
    const minCategoryCount = Math.min(...categories.map((c) => c._count.category));
    if (maxCategoryCount > minCategoryCount * 2) {
      suggestions.push(`  ⚠️  分类不平衡: 最多 ${maxCategoryCount} 个，最少 ${minCategoryCount} 个`);
    }

    // 检查 prompt 策略一致性
    if (withBasePrompt < weddingTemplates.length * 0.8) {
      suggestions.push(`  ⚠️  部分模板缺少 basePrompt (${withBasePrompt}/${weddingTemplates.length})`);
    }

    // 检查预览图
    const noPreview = weddingTemplates.filter((t) => !t.preview_image_url).length;
    if (noPreview > 0) {
      suggestions.push(`  ⚠️  ${noPreview} 个模板缺少预览图`);
    }

    // 检查人脸检测配置
    if (weddingDomain?.require_face_detection) {
      suggestions.push('  ✅ 已启用人脸检测，确保上传照片质量');
    }

    if (suggestions.length === 0) {
      console.log('  ✅ Wedding domain 配置良好，无明显问题');
    } else {
      suggestions.forEach((s) => console.log(s));
    }

    // 8. 下一步行动
    console.log('\n\n🚀 【下一步行动建议】');
    console.log('  1. 为所有模板上传高质量预览图到 MinIO');
    console.log('  2. 统一 prompt 策略，确保所有模板都有 basePrompt');
    console.log('  3. 测试人脸检测功能，确保用户体验流畅');
    console.log('  4. 收集用户反馈，优化热门模板的 prompt');
    console.log('  5. 考虑添加更多细分场景 (如：海边婚纱、森林婚纱等)');

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    分析报告完成                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
