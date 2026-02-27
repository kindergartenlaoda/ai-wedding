import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function getTemplatesByDomain() {
  try {
    const templates = await prisma.templates.findMany({
      where: {
        domain: {
          in: ['wedding', 'children', 'id_photo', 'portrait', 'anime']
        }
      },
      orderBy: [
        { domain: 'asc' },
        { sort_order: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        domain: true,
        category: true,
        description: true,
        is_active: true,
        sort_order: true,
        price_credits: true,
      }
    });
    
    // Group by domain
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.domain]) acc[t.domain] = [];
      acc[t.domain].push(t);
      return acc;
    }, {} as Record<string, typeof templates>);
    
    // Print summary
    console.log('=== 人物相关域的模板统计 ===\n');
    
    for (const [domain, temps] of Object.entries(grouped)) {
      console.log(`\n【${domain}】 - 共 ${temps.length} 个模板:`);
      temps.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.name} (${t.category}) - ${t.price_credits}积分`);
        if (t.description) {
          console.log(`     描述: ${t.description}`);
        }
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

getTemplatesByDomain();
