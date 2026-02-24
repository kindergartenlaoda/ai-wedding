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

  const existingCount = await prisma.template.count();
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
      previewImageUrl:
        'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'romantic wedding photo in Paris' },
      promptList: [
        'A romantic wedding photo in front of the Eiffel Tower, golden hour lighting',
      ],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '可爱童趣',
      description: '温馨可爱的儿童摄影风格',
      category: 'outdoor',
      domain: 'children',
      previewImageUrl:
        'https://images.pexels.com/photos/1648377/pexels-photo-1648377.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'cute children photo in a garden' },
      promptList: ['A cute child playing in a sunny garden with flowers'],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '标准证件照',
      description: '白底蓝底标准证件照',
      category: 'standard',
      domain: 'id_photo',
      previewImageUrl:
        'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'professional ID photo with white background' },
      promptList: [
        'Professional ID photo, white background, even lighting, formal attire',
      ],
      priceCredits: 5,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '油画风格',
      description: '经典油画艺术风格',
      category: 'painting',
      domain: 'artistic',
      previewImageUrl:
        'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'oil painting style portrait' },
      promptList: [
        'Classical oil painting style portrait with rich colors and dramatic lighting',
      ],
      priceCredits: 15,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '时尚写真',
      description: '专业时尚人像写真',
      category: 'fashion',
      domain: 'portrait',
      previewImageUrl:
        'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'fashion portrait photography' },
      promptList: ['High-fashion portrait with professional studio lighting'],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '日系动漫',
      description: '日本动漫风格转换',
      category: 'japanese',
      domain: 'anime',
      previewImageUrl:
        'https://images.pexels.com/photos/2832382/pexels-photo-2832382.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'Japanese anime style character' },
      promptList: [
        'Japanese anime style character with vibrant colors and detailed eyes',
      ],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '壮丽山河',
      description: '壮观自然风景',
      category: 'nature',
      domain: 'landscape',
      previewImageUrl:
        'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'majestic mountain landscape' },
      promptList: [
        'Majestic mountain landscape with dramatic sky and golden hour lighting',
      ],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '商品展示',
      description: '专业商品摄影',
      category: 'studio',
      domain: 'product',
      previewImageUrl:
        'https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg?auto=compress&cs=tinysrgb&w=800',
      promptConfig: { basePrompt: 'professional product photography' },
      promptList: [
        'Professional product photography with clean white background and soft shadows',
      ],
      priceCredits: 10,
      isActive: true,
      sortOrder: 1,
    },
  ];

  await prisma.template.createMany({ data: templates });
  console.log(`Seed data inserted successfully: ${templates.length} templates`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
