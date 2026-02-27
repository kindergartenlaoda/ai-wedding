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

async function analyzeStructure() {
  try {
    // 1. 获取所有域
    const domains = await prisma.domains.findMany({
      orderBy: { sort_order: 'asc' },
    });
    
    // 2. 获取所有模板
    const templates = await prisma.templates.findMany({
      orderBy: [
        { domain: 'asc' },
        { sort_order: 'asc' }
      ],
    });
    
    console.log('=== 数据结构分析 ===\n');
    
    console.log('【域（Domains）】- 顶层分类');
    console.log('数量:', domains.length);
    console.log('字段: id, slug, name, description, icon, color, cover_image, is_active, sort_order, require_face_detection\n');
    
    console.log('【模板（Templates）】- 具体生成模板');
    console.log('数量:', templates.length);
    console.log('字段: id, name, description, category, domain, preview_image_url, prompt_config, prompt_list, price_credits, is_active, sort_order\n');
    
    console.log('【关系】');
    console.log('- 一个域（Domain）可以有多个模板（Templates）');
    console.log('- 模板通过 domain 字段关联到域的 slug');
    console.log('- 例如: domain="wedding" 的模板属于 slug="wedding" 的域\n');
    
    console.log('=== 各域的模板分布 ===\n');
    
    domains.forEach(domain => {
      const domainTemplates = templates.filter(t => t.domain === domain.slug);
      console.log(`【${domain.name}】(${domain.slug})`);
      console.log(`  模板数量: ${domainTemplates.length}`);
      console.log(`  需要人脸识别: ${domain.require_face_detection ? '是' : '否'}`);
      console.log(`  状态: ${domain.is_active ? '启用' : '停用'}`);
      
      if (domainTemplates.length > 0) {
        console.log('  模板列表:');
        domainTemplates.forEach((t, idx) => {
          console.log(`    ${idx + 1}. ${t.name} (${t.category}) - ${t.price_credits}积分`);
        });
      }
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

analyzeStructure();
