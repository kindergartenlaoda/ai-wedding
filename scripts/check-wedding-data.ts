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
    console.log('=== WEDDING DOMAIN INFO ===');
    const weddingDomain = await prisma.domains.findUnique({
      where: { slug: 'wedding' },
    });
    console.log(JSON.stringify(weddingDomain, null, 2));

    console.log('\n=== WEDDING TEMPLATES ===');
    const weddingTemplates = await prisma.templates.findMany({
      where: { domain: 'wedding', is_active: true },
      orderBy: { sort_order: 'asc' },
    });
    console.log(`Total: ${weddingTemplates.length} templates`);
    weddingTemplates.forEach((t, i) => {
      console.log(`\n[${i + 1}] ${t.name}`);
      console.log(`  - ID: ${t.id}`);
      console.log(`  - Category: ${t.category}`);
      console.log(`  - Price: ${t.price_credits} credits`);
      console.log(`  - Sort Order: ${t.sort_order}`);
      console.log(`  - Preview: ${t.preview_image_url?.substring(0, 60)}...`);
      console.log(`  - Prompt Config: ${JSON.stringify(t.prompt_config).substring(0, 80)}...`);
      console.log(`  - Prompt List: ${JSON.stringify(t.prompt_list).substring(0, 80)}...`);
    });

    console.log('\n=== WEDDING PROJECTS ===');
    const weddingProjects = await prisma.projects.count({
      where: { domain: 'wedding' },
    });
    console.log(`Total: ${weddingProjects} projects`);

    console.log('\n=== WEDDING GENERATIONS ===');
    const weddingGenerations = await prisma.generations.count({
      where: { domain: 'wedding' },
    });
    console.log(`Total: ${weddingGenerations} generations`);

    console.log('\n=== TEMPLATE CATEGORIES ===');
    const categories = await prisma.templates.groupBy({
      by: ['category'],
      where: { domain: 'wedding', is_active: true },
      _count: { category: true },
    });
    categories.forEach((c) => {
      console.log(`  - ${c.category}: ${c._count.category} templates`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
