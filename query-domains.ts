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

async function getDomainStats() {
  try {
    // Get all domains
    const domains = await prisma.domains.findMany({
      orderBy: { sort_order: 'asc' },
    });
    
    // Get template counts per domain
    const templates = await prisma.templates.findMany({
      select: { domain: true }
    });
    
    // Get project counts per domain
    const projects = await prisma.projects.findMany({
      select: { domain: true }
    });
    
    // Count by domain
    const templateCounts = templates.reduce((acc, t) => {
      acc[t.domain] = (acc[t.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const projectCounts = projects.reduce((acc, p) => {
      acc[p.domain] = (acc[p.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(JSON.stringify({
      total: domains.length,
      active: domains.filter(d => d.is_active).length,
      inactive: domains.filter(d => !d.is_active).length,
      domains: domains.map(d => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        icon: d.icon,
        color: d.color,
        cover_image: d.cover_image,
        is_active: d.is_active,
        sort_order: d.sort_order,
        require_face_detection: d.require_face_detection,
        template_count: templateCounts[d.slug] || 0,
        project_count: projectCounts[d.slug] || 0,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }))
    }, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

getDomainStats();
