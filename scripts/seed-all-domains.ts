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
    // 检查现有模板数量
    const existingTemplates = await prisma.templates.findMany({
      select: { domain: true, name: true },
    });
    console.log(`\n=== 现有模板: ${existingTemplates.length} 个 ===`);
    const domainCounts = existingTemplates.reduce((acc, t) => {
      acc[t.domain] = (acc[t.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(domainCounts).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} 个`);
    });

    // 新增模板数据
    const newTemplates = [
      // ========== Children Domain (儿童照) ==========
      {
        name: '百天纪念照',
        description: '宝宝百天纪念，温馨可爱风格',
        category: 'milestone',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'adorable baby 100-day milestone photo' },
        prompt_list: ['A cute baby in soft pastel outfit, lying on fluffy white blanket, natural window light, gentle smile'],
        price_credits: 8,
        is_active: true,
        sort_order: 1,
      },
      {
        name: '周岁抓周',
        description: '宝宝周岁抓周仪式照',
        category: 'milestone',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'first birthday celebration photo' },
        prompt_list: ['A happy one-year-old baby sitting with colorful toys, birthday cake, bright studio lighting, joyful expression'],
        price_credits: 8,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '亲子互动',
        description: '温馨亲子时光记录',
        category: 'family',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'warm family moment with children' },
        prompt_list: ['Parents playing with young child in park, golden hour sunlight, natural candid moment, genuine smiles'],
        price_credits: 10,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '户外探险',
        description: '儿童户外活动记录',
        category: 'outdoor',
        domain: 'children',
        preview_image_url: 'https://images.unsplash.com/photo-1503516459261-40c66117780a?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'children outdoor adventure photo' },
        prompt_list: ['Child exploring nature, running in meadow, bright sunny day, playful energy, vibrant colors'],
        price_credits: 8,
        is_active: true,
        sort_order: 4,
      },

      // ========== ID Photo Domain (证件照) ==========
      {
        name: '签证照片',
        description: '各国签证标准照片',
        category: 'visa',
        domain: 'id_photo',
        preview_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'professional visa photo' },
        prompt_list: ['Professional visa photo, white background, neutral expression, formal attire, even lighting, 2-inch format'],
        price_credits: 5,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '求职简历照',
        description: '职业形象照片',
        category: 'resume',
        domain: 'id_photo',
        preview_image_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'professional resume photo' },
        prompt_list: ['Professional resume photo, light blue background, confident smile, business casual attire, studio lighting'],
        price_credits: 5,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '学生证照',
        description: '学生证件照',
        category: 'student',
        domain: 'id_photo',
        preview_image_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'student ID photo' },
        prompt_list: ['Student ID photo, white background, natural smile, casual neat attire, soft lighting'],
        price_credits: 5,
        is_active: true,
        sort_order: 4,
      },

      // ========== Artistic Domain (艺术照) ==========
      {
        name: '国风水墨',
        description: '中国传统水墨画风格',
        category: 'traditional',
        domain: 'artistic',
        preview_image_url: 'https://images.unsplash.com/photo-1528991435120-e73e05a58897?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'Chinese ink painting style portrait' },
        prompt_list: ['Portrait in traditional Chinese ink painting style, flowing brushstrokes, monochrome with subtle color accents, ethereal atmosphere'],
        price_credits: 15,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '赛博朋克',
        description: '未来科幻赛博朋克风格',
        category: 'scifi',
        domain: 'artistic',
        preview_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'cyberpunk style portrait' },
        prompt_list: ['Cyberpunk style portrait, neon lights, futuristic cityscape background, high-tech aesthetic, vibrant purple and blue tones'],
        price_credits: 15,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '复古胶片',
        description: '80年代复古胶片风格',
        category: 'vintage',
        domain: 'artistic',
        preview_image_url: 'https://images.unsplash.com/photo-1509909756405-be0199881695?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'vintage film photography style' },
        prompt_list: ['Vintage 1980s film photography style, grainy texture, warm faded colors, nostalgic atmosphere, analog camera aesthetic'],
        price_credits: 12,
        is_active: true,
        sort_order: 4,
      },

      // ========== Portrait Domain (个人写真) ==========
      {
        name: '职业形象照',
        description: '专业商务形象照',
        category: 'business',
        domain: 'portrait',
        preview_image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'professional business portrait' },
        prompt_list: ['Professional business portrait, neutral gray background, confident posture, formal business attire, studio lighting'],
        price_credits: 10,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '社交头像',
        description: '社交媒体个性头像',
        category: 'social',
        domain: 'portrait',
        preview_image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'social media profile photo' },
        prompt_list: ['Friendly social media profile photo, soft natural lighting, genuine smile, casual stylish outfit, blurred background'],
        price_credits: 8,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '艺术人像',
        description: '创意艺术人像摄影',
        category: 'artistic',
        domain: 'portrait',
        preview_image_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'artistic portrait photography' },
        prompt_list: ['Artistic portrait with dramatic lighting, creative composition, moody atmosphere, fine art photography style'],
        price_credits: 12,
        is_active: true,
        sort_order: 4,
      },

      // ========== Anime Domain (动漫头像) ==========
      {
        name: '国漫风格',
        description: '中国动漫风格转换',
        category: 'chinese',
        domain: 'anime',
        preview_image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'Chinese anime style character' },
        prompt_list: ['Chinese anime style character, elegant flowing hair, traditional-inspired outfit, soft watercolor aesthetic, gentle expression'],
        price_credits: 10,
        is_active: true,
        sort_order: 2,
      },
      {
        name: 'Q版卡通',
        description: '可爱Q版卡通风格',
        category: 'chibi',
        domain: 'anime',
        preview_image_url: 'https://images.unsplash.com/photo-1613376023733-0a73315d9b06?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'cute chibi cartoon style' },
        prompt_list: ['Cute chibi cartoon style character, oversized head, big sparkling eyes, adorable proportions, pastel colors, kawaii aesthetic'],
        price_credits: 8,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '美式漫画',
        description: '美式漫画风格',
        category: 'western',
        domain: 'anime',
        preview_image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'American comic book style' },
        prompt_list: ['American comic book style character, bold outlines, vibrant colors, dynamic pose, halftone shading, superhero aesthetic'],
        price_credits: 10,
        is_active: true,
        sort_order: 4,
      },

      // ========== Landscape Domain (风景壁纸) ==========
      {
        name: '梦幻星空',
        description: '璀璨星空夜景',
        category: 'night',
        domain: 'landscape',
        preview_image_url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'dreamy starry night sky' },
        prompt_list: ['Dreamy starry night sky, Milky Way visible, silhouette of mountains, deep blue and purple tones, peaceful atmosphere'],
        price_credits: 10,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '海滨日落',
        description: '浪漫海边日落',
        category: 'seascape',
        domain: 'landscape',
        preview_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'romantic beach sunset' },
        prompt_list: ['Romantic beach sunset, golden hour lighting, gentle waves, warm orange and pink sky, serene coastal scene'],
        price_credits: 10,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '城市夜景',
        description: '现代都市夜景',
        category: 'urban',
        domain: 'landscape',
        preview_image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'modern city night view' },
        prompt_list: ['Modern city night view, illuminated skyscrapers, light trails from traffic, vibrant urban energy, blue hour atmosphere'],
        price_credits: 10,
        is_active: true,
        sort_order: 4,
      },

      // ========== Product Domain (商品图) ==========
      {
        name: '白底商品图',
        description: '纯白背景商品展示',
        category: 'ecommerce',
        domain: 'product',
        preview_image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'product photo white background' },
        prompt_list: ['Professional product photography, pure white background, centered composition, soft even lighting, no shadows, e-commerce ready'],
        price_credits: 8,
        is_active: true,
        sort_order: 2,
      },
      {
        name: '场景化商品',
        description: '生活场景商品展示',
        category: 'lifestyle',
        domain: 'product',
        preview_image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'lifestyle product photography' },
        prompt_list: ['Lifestyle product photography, natural setting, product in use context, warm ambient lighting, aspirational mood'],
        price_credits: 10,
        is_active: true,
        sort_order: 3,
      },
      {
        name: '创意商品图',
        description: '创意视觉商品展示',
        category: 'creative',
        domain: 'product',
        preview_image_url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=800&auto=format&fit=crop',
        prompt_config: { basePrompt: 'creative product photography' },
        prompt_list: ['Creative product photography, artistic composition, dramatic lighting, bold colors, eye-catching visual design'],
        price_credits: 12,
        is_active: true,
        sort_order: 4,
      },
    ];

    console.log(`\n=== 准备添加 ${newTemplates.length} 个新模板 ===`);
    const newDomainCounts = newTemplates.reduce((acc, t) => {
      acc[t.domain] = (acc[t.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(newDomainCounts).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} 个`);
    });

    // 批量插入
    const result = await prisma.templates.createMany({
      data: newTemplates,
      skipDuplicates: true,
    });

    console.log(`\n✅ 成功添加 ${result.count} 个模板`);

    // 显示最终统计
    const finalTemplates = await prisma.templates.findMany({
      where: { is_active: true },
      select: { domain: true },
    });
    const finalCounts = finalTemplates.reduce((acc, t) => {
      acc[t.domain] = (acc[t.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n=== 最终模板分布 (激活状态) ===`);
    Object.entries(finalCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count} 个`);
      });
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
