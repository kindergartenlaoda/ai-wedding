import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

interface DomainData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  require_face_detection: boolean;
  is_active: boolean;
  sort_order: number;
}

const newDomains: DomainData[] = [
  {
    slug: 'maternity',
    name: 'AI 孕妇照',
    description: '记录孕期美好时光，专业孕妇写真',
    icon: 'Baby',
    color: 'from-pink-400 to-rose-400',
    require_face_detection: true,
    is_active: true,
    sort_order: 8,
  },
  {
    slug: 'graduation',
    name: 'AI 毕业照',
    description: '毕业季纪念，学士服写真',
    icon: 'GraduationCap',
    color: 'from-blue-400 to-indigo-500',
    require_face_detection: true,
    is_active: true,
    sort_order: 9,
  },
  {
    slug: 'couple',
    name: 'AI 情侣写真',
    description: '情侣合照，记录甜蜜时光',
    icon: 'Heart',
    color: 'from-rose-400 to-pink-500',
    require_face_detection: true,
    is_active: true,
    sort_order: 10,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log(`Seeding ${newDomains.length} new domains...`);

  let created = 0;
  let updated = 0;

  for (const domain of newDomains) {
    const existing = await prisma.domains.findUnique({
      where: { slug: domain.slug },
    });

    await prisma.domains.upsert({
      where: { slug: domain.slug },
      update: {
        name: domain.name,
        description: domain.description,
        icon: domain.icon,
        color: domain.color,
        require_face_detection: domain.require_face_detection,
        is_active: domain.is_active,
        sort_order: domain.sort_order,
      },
      create: domain,
    });

    if (existing) {
      updated++;
      console.log(`  [UPD] ${domain.name} (${domain.slug})`);
    } else {
      created++;
      console.log(`  [NEW] ${domain.name} (${domain.slug})`);
    }
  }

  console.log(
    `\nDone! Created: ${created}, Updated: ${updated}, Total: ${newDomains.length}`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
