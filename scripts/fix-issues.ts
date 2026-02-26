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
    console.log('\n🔧 开始修复检测到的问题...\n');

    // 问题 1: 激活 children domain
    console.log('1️⃣  激活 children domain...');
    await prisma.domains.update({
      where: { slug: 'children' },
      data: { is_active: true },
    });
    console.log('   ✅ children domain 已激活\n');

    // 问题 2: 修正异常高价模板
    console.log('2️⃣  修正异常高价模板...');
    const expensiveTemplate = await prisma.templates.findFirst({
      where: { name: '韩式室内婚纱照风格' },
    });
    if (expensiveTemplate) {
      await prisma.templates.update({
        where: { id: expensiveTemplate.id },
        data: { price_credits: 15 }, // 从 50 降到 15
      });
      console.log('   ✅ "韩式室内婚纱照风格" 价格从 50 调整为 15 credits\n');
    }

    // 问题 3: 为 wedding domain 增加更多模板，平衡分布
    console.log('3️⃣  为其他 domain 增加模板，平衡分布...');
    const balanceTemplates = [
      // Children - 再加 4 个达到 9 个
      {
        name: '新生儿写真',
        description: '新生儿满月纪念照',
        category: 'newborn',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'newborn baby portrait' },
        prompt_list: ['Peaceful newborn baby sleeping, wrapped in soft blanket, gentle natural light, tender moment'],
        price_credits: 8,
        is_active: true,
        sort_order: 5,
      },
      {
        name: '儿童派对',
        description: '生日派对欢乐时刻',
        category: 'party',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'children birthday party photo' },
        prompt_list: ['Joyful children at birthday party, colorful balloons and decorations, happy celebration moment'],
        price_credits: 10,
        is_active: true,
        sort_order: 6,
      },
      {
        name: '校园时光',
        description: '校园生活记录',
        category: 'school',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'school children photo' },
        prompt_list: ['Children in school uniform, classroom or playground setting, natural candid moment, bright daylight'],
        price_credits: 8,
        is_active: true,
        sort_order: 7,
      },
      {
        name: '兄弟姐妹',
        description: '兄弟姐妹温馨合照',
        category: 'siblings',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'siblings portrait' },
        prompt_list: ['Siblings together, warm interaction, natural smiles, soft lighting, family bond moment'],
        price_credits: 10,
        is_active: true,
        sort_order: 8,
      },

      // ID Photo - 再加 1 个达到 5 个
      {
        name: '护照照片',
        description: '国际护照标准照',
        category: 'passport',
        domain: 'id_photo',
        preview_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'passport photo' },
        prompt_list: ['International passport photo, white background, neutral expression, formal attire, standard lighting'],
        price_credits: 5,
        is_active: true,
        sort_order: 5,
      },

      // Artistic - 再加 1 个达到 5 个
      {
        name: '梦幻插画',
        description: '梦幻童话插画风格',
        category: 'illustration',
        domain: 'artistic',
        preview_image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'dreamy illustration style' },
        prompt_list: ['Dreamy illustration style portrait, soft pastel colors, whimsical atmosphere, fairy tale aesthetic'],
        price_credits: 15,
        is_active: true,
        sort_order: 5,
      },

      // Portrait - 再加 1 个达到 5 个
      {
        name: '户外自然光',
        description: '户外自然光人像',
        category: 'outdoor',
        domain: 'portrait',
        preview_image_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'outdoor natural light portrait' },
        prompt_list: ['Outdoor portrait with natural sunlight, golden hour glow, relaxed pose, nature background'],
        price_credits: 10,
        is_active: true,
        sort_order: 5,
      },

      // Anime - 再加 1 个达到 5 个
      {
        name: '像素风格',
        description: '复古像素艺术风格',
        category: 'pixel',
        domain: 'anime',
        preview_image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'pixel art style' },
        prompt_list: ['Retro pixel art style character, 8-bit aesthetic, vibrant colors, nostalgic gaming vibe'],
        price_credits: 8,
        is_active: true,
        sort_order: 5,
      },

      // Landscape - 再加 1 个达到 5 个
      {
        name: '四季更替',
        description: '四季风景变化',
        category: 'seasonal',
        domain: 'landscape',
        preview_image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'seasonal landscape' },
        prompt_list: ['Beautiful seasonal landscape, autumn colors or spring blossoms, natural scenery, peaceful atmosphere'],
        price_credits: 10,
        is_active: true,
        sort_order: 5,
      },

      // Product - 再加 1 个达到 5 个
      {
        name: '悬浮展示',
        description: '悬浮效果商品展示',
        category: 'floating',
        domain: 'product',
        preview_image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'floating product photography' },
        prompt_list: ['Product floating in air, clean minimalist background, dramatic shadows, modern aesthetic'],
        price_credits: 12,
        is_active: true,
        sort_order: 5,
      },
    ];

    const result = await prisma.templates.createMany({
      data: balanceTemplates,
      skipDuplicates: true,
    });
    console.log(`   ✅ 成功添加 ${result.count} 个平衡模板\n`);

    // 验证修复结果
    console.log('4️⃣  验证修复结果...\n');

    const domains = await prisma.domains.findMany({
      where: { is_active: true },
    });
    console.log(`   ✅ 激活的 domain: ${domains.length} 个`);

    const templatesByDomain = await prisma.templates.groupBy({
      by: ['domain'],
      where: { is_active: true },
      _count: { domain: true },
    });

    console.log('\n   📊 最终模板分布:');
    templatesByDomain
      .sort((a, b) => b._count.domain - a._count.domain)
      .forEach((t) => {
        const domainInfo = domains.find((d) => d.slug === t.domain);
        const domainName = domainInfo?.name || t.domain;
        const bar = '█'.repeat(Math.ceil(t._count.domain / 2));
        console.log(`      ${domainName.padEnd(12)} ${bar} ${t._count.domain} 个`);
      });

    const priceCheck = await prisma.templates.findMany({
      where: { is_active: true, price_credits: { gte: 30 } },
      select: { name: true, price_credits: true },
    });

    if (priceCheck.length === 0) {
      console.log('\n   ✅ 无异常高价模板');
    } else {
      console.log('\n   ⚠️  仍有异常高价模板:');
      priceCheck.forEach((t) => {
        console.log(`      - ${t.name}: ${t.price_credits} credits`);
      });
    }

    console.log('\n✅ 所有问题修复完成！\n');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
