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
    console.log('=== DOMAINS ===');
    const domains = await prisma.domains.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
    console.log(JSON.stringify(domains, null, 2));

    console.log('\n=== TEMPLATE COUNT BY DOMAIN ===');
    const templateCount = await prisma.templates.groupBy({
      by: ['domain'],
      where: { is_active: true },
      _count: { domain: true },
    });
    console.log(JSON.stringify(templateCount, null, 2));

    console.log('\n=== TEMPLATES (first 20) ===');
    const templates = await prisma.templates.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        category: true,
        domain: true,
        price_credits: true,
        sort_order: true,
      },
      orderBy: [{ domain: 'asc' }, { sort_order: 'asc' }],
      take: 20,
    });
    console.log(JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
