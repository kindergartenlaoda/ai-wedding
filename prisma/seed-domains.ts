import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_DOMAINS = [
    {
        slug: 'wedding',
        name: 'AI 婚纱照',
        description: '唯美婚纱、旅拍、中式喜庆，多风格一键生成',
        icon: 'Camera',
        color: 'from-pink-500 to-rose-500',
        cover_image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
        sort_order: 0,
    },
    {
        slug: 'children',
        name: 'AI 儿童照',
        description: '百天、周岁、亲子合照，可爱风格随心选',
        icon: 'Baby',
        color: 'from-amber-400 to-orange-500',
        cover_image: 'https://images.unsplash.com/photo-1627885489708-ce79ebabc2c8?q=80&w=800&auto=format&fit=crop',
        sort_order: 1,
    },
    {
        slug: 'id_photo',
        name: 'AI 证件照',
        description: '一键换底色，签证/简历/社保等规格齐全',
        icon: 'CreditCard',
        color: 'from-blue-500 to-indigo-500',
        cover_image: 'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=800&auto=format&fit=crop',
        sort_order: 2,
    },
    {
        slug: 'artistic',
        name: 'AI 艺术照',
        description: '油画、国风、赛博朋克，探索无限艺术风格',
        icon: 'Palette',
        color: 'from-purple-500 to-violet-500',
        cover_image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800&auto=format&fit=crop',
        sort_order: 3,
    },
    {
        slug: 'portrait',
        name: 'AI 个人写真',
        description: '形象照、社交头像、职场照，展现最佳状态',
        icon: 'User',
        color: 'from-teal-500 to-cyan-500',
        cover_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
        sort_order: 4,
    },
    {
        slug: 'anime',
        name: 'AI 动漫头像',
        description: '日漫、国漫、Q版风格，秒变二次元',
        icon: 'Wand2',
        color: 'from-fuchsia-500 to-pink-500',
        cover_image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
        sort_order: 5,
    },
    {
        slug: 'landscape',
        name: 'AI 风景壁纸',
        description: '梦幻风景、插画地标，随手生成桌面壁纸',
        icon: 'Mountain',
        color: 'from-emerald-500 to-green-500',
        cover_image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
        sort_order: 6,
    },
    {
        slug: 'product',
        name: 'AI 商品图',
        description: '电商主图、白底图、场景图，0成本拍大片',
        icon: 'ShoppingBag',
        color: 'from-slate-500 to-gray-600',
        cover_image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
        sort_order: 7,
    },
];

async function main() {
    console.log('🌱 Seeding domains...');

    for (const domain of SEED_DOMAINS) {
        const result = await prisma.domains.upsert({
            where: { slug: domain.slug },
            update: {
                name: domain.name,
                description: domain.description,
                icon: domain.icon,
                color: domain.color,
                cover_image: domain.cover_image,
                sort_order: domain.sort_order,
            },
            create: domain,
        });
        console.log(`  ✅ ${result.slug} → ${result.name}`);
    }

    console.log('\n🎉 Domain seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
