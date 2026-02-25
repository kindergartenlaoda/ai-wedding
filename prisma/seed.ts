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

  const existingCount = await prisma.templates.count();
  if (existingCount > 0) {
    console.log(`Templates already exist (${existingCount}), skipping seed`);
    await prisma.$disconnect();
    return;
  }

  const templates = [
    {
      name: '巴黎浪漫',
      description: 'Classic wedding photos with Eiffel Tower backdrop',
      category: 'location',
      domain: 'wedding',
      preview_image_url:
        'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'romantic wedding photo in Paris' },
      prompt_list: [
        'A romantic wedding photo in front of the Eiffel Tower, golden hour lighting',
      ],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '可爱童趣',
      description: '温馨可爱的儿童摄影风格',
      category: 'outdoor',
      domain: 'children',
      preview_image_url:
        'https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'cute children photo in a garden' },
      prompt_list: ['A cute child playing in a sunny garden with flowers'],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '标准证件照',
      description: '白底蓝底标准证件照',
      category: 'standard',
      domain: 'id_photo',
      preview_image_url:
        'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'professional ID photo with white background' },
      prompt_list: [
        'Professional ID photo, white background, even lighting, formal attire',
      ],
      price_credits: 5,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '油画风格',
      description: '经典油画艺术风格',
      category: 'painting',
      domain: 'artistic',
      preview_image_url:
        'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'oil painting style portrait' },
      prompt_list: [
        'Classical oil painting style portrait with rich colors and dramatic lighting',
      ],
      price_credits: 15,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '时尚写真',
      description: '专业时尚人像写真',
      category: 'fashion',
      domain: 'portrait',
      preview_image_url:
        'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'fashion portrait photography' },
      prompt_list: ['High-fashion portrait with professional studio lighting'],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '日系动漫',
      description: '日本动漫风格转换',
      category: 'japanese',
      domain: 'anime',
      preview_image_url:
        'https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'Japanese anime style character' },
      prompt_list: [
        'Japanese anime style character with vibrant colors and detailed eyes',
      ],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '壮丽山河',
      description: '壮观自然风景',
      category: 'nature',
      domain: 'landscape',
      preview_image_url:
        'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'majestic mountain landscape' },
      prompt_list: [
        'Majestic mountain landscape with dramatic sky and golden hour lighting',
      ],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
    {
      name: '商品展示',
      description: '专业商品摄影',
      category: 'studio',
      domain: 'product',
      preview_image_url:
        'https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg?auto=compress&cs=tinysrgb&w=800',
      prompt_config: { basePrompt: 'professional product photography' },
      prompt_list: [
        'Professional product photography with clean white background and soft shadows',
      ],
      price_credits: 10,
      is_active: true,
      sort_order: 1,
    },
  ];

  await prisma.templates.createMany({ data: templates });
  console.log(`Seed data inserted successfully: ${templates.length} templates`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
