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
    console.log('\n🔧 开始应用优化建议...\n');

    // 1. 为建议的 domain 启用人脸检测
    console.log('1️⃣  启用人脸检测...');
    const domainsToEnableFaceDetection = ['children', 'id_photo', 'portrait'];

    for (const slug of domainsToEnableFaceDetection) {
      const domain = await prisma.domains.findUnique({
        where: { slug },
      });

      if (domain && !domain.require_face_detection) {
        await prisma.domains.update({
          where: { slug },
          data: { require_face_detection: true },
        });
        console.log(`   ✅ ${domain.name} (${slug}) 已启用人脸检测`);
      } else if (domain?.require_face_detection) {
        console.log(`   ℹ️  ${domain.name} (${slug}) 已经启用人脸检测`);
      }
    }

    // 2. 统一 prompt 策略 - 为缺少 basePrompt 的模板添加
    console.log('\n2️⃣  统一 prompt 策略...');
    const templates = await prisma.templates.findMany({
      where: { is_active: true },
    });

    let updatedCount = 0;
    for (const template of templates) {
      const promptConfig = template.prompt_config as any;
      const promptList = template.prompt_list as any;

      // 如果没有 basePrompt，从 prompt_list 第一条提取
      if (!promptConfig?.basePrompt && Array.isArray(promptList) && promptList.length > 0) {
        const firstPrompt = promptList[0];
        // 提取前 50 个字符作为 basePrompt
        const basePrompt = firstPrompt.substring(0, 50).trim();

        await prisma.templates.update({
          where: { id: template.id },
          data: {
            prompt_config: {
              ...promptConfig,
              basePrompt,
            },
          },
        });

        updatedCount++;
        console.log(`   ✅ ${template.name} - 添加 basePrompt: "${basePrompt}..."`);
      }
    }

    if (updatedCount === 0) {
      console.log('   ℹ️  所有模板已有 basePrompt');
    } else {
      console.log(`   ✅ 共更新 ${updatedCount} 个模板`);
    }

    // 3. 优化价格策略 - 调整证件照价格
    console.log('\n3️⃣  优化价格策略...');
    const idPhotoTemplates = await prisma.templates.findMany({
      where: { domain: 'id_photo', is_active: true },
    });

    // 证件照建议价格: 标准 5, 签证/护照 6, 求职 7
    const priceMap: Record<string, number> = {
      standard: 5,
      visa: 6,
      passport: 6,
      resume: 7,
      student: 5,
    };

    let priceUpdatedCount = 0;
    for (const template of idPhotoTemplates) {
      const suggestedPrice = priceMap[template.category];
      if (suggestedPrice && template.price_credits !== suggestedPrice) {
        await prisma.templates.update({
          where: { id: template.id },
          data: { price_credits: suggestedPrice },
        });
        console.log(
          `   ✅ ${template.name} - 价格调整: ${template.price_credits} → ${suggestedPrice} credits`
        );
        priceUpdatedCount++;
      }
    }

    if (priceUpdatedCount === 0) {
      console.log('   ℹ️  证件照价格策略已优化');
    }

    // 4. 优化 sort_order - 确保每个 domain 内的模板有合理的排序
    console.log('\n4️⃣  优化模板排序...');
    const domains = await prisma.domains.findMany({
      where: { is_active: true },
    });

    for (const domain of domains) {
      const domainTemplates = await prisma.templates.findMany({
        where: { domain: domain.slug, is_active: true },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      });

      // 重新分配 sort_order (1, 2, 3, ...)
      for (let i = 0; i < domainTemplates.length; i++) {
        const newSortOrder = i + 1;
        if (domainTemplates[i].sort_order !== newSortOrder) {
          await prisma.templates.update({
            where: { id: domainTemplates[i].id },
            data: { sort_order: newSortOrder },
          });
        }
      }
      console.log(`   ✅ ${domain.name} - 排序已优化 (1-${domainTemplates.length})`);
    }

    // 5. 验证优化结果
    console.log('\n5️⃣  验证优化结果...\n');

    const domainsAfter = await prisma.domains.findMany({
      where: { is_active: true },
    });

    const faceDetectionEnabled = domainsAfter.filter((d) => d.require_face_detection);
    console.log(`   ✅ 启用人脸检测的 domain: ${faceDetectionEnabled.length} 个`);
    faceDetectionEnabled.forEach((d) => {
      console.log(`      - ${d.name} (${d.slug})`);
    });

    const templatesAfter = await prisma.templates.findMany({
      where: { is_active: true },
    });

    const withBasePrompt = templatesAfter.filter((t) => {
      const config = t.prompt_config as any;
      return config?.basePrompt;
    });

    console.log(`\n   ✅ 有 basePrompt 的模板: ${withBasePrompt.length}/${templatesAfter.length} 个`);

    const priceStats = await prisma.templates.aggregate({
      where: { is_active: true },
      _avg: { price_credits: true },
      _min: { price_credits: true },
      _max: { price_credits: true },
    });

    console.log(`\n   ✅ 价格统计:`);
    console.log(`      - 平均: ${priceStats._avg.price_credits?.toFixed(1)} credits`);
    console.log(`      - 最低: ${priceStats._min.price_credits} credits`);
    console.log(`      - 最高: ${priceStats._max.price_credits} credits`);

    console.log('\n✅ 所有优化已完成！\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
