import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { domainsSeedData } from './seed-data/domains';
import { templatesSeedData } from './seed-data/templates';
import { modelConfigsSeedData } from './seed-data/model-configs';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function seedAdminUser(prisma: PrismaClient): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('  ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping');
    return;
  }

  if (adminPassword.length < 6) {
    console.log('  ADMIN_PASSWORD must be at least 6 characters, skipping');
    return;
  }

  const existingUser = await prisma.users.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    const profile = await prisma.profiles.findUnique({
      where: { user_id: existingUser.id },
    });

    if (profile && profile.role === 'admin') {
      console.log(`  Admin already exists: ${adminEmail}`);
      return;
    }

    if (profile) {
      await prisma.profiles.update({
        where: { user_id: existingUser.id },
        data: { role: 'admin' },
      });
      console.log(`  Promoted existing user to admin: ${adminEmail}`);
      return;
    }
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        name: 'Admin',
      },
    });

    await tx.profiles.create({
      data: {
        user_id: user.id,
        credits: 9999,
        role: 'admin',
        invite_code: generateInviteCode(),
      },
    });
  });

  console.log(`  Admin created: ${adminEmail}`);
}

async function seedDomains(prisma: PrismaClient): Promise<void> {
  const existingCount = await prisma.domains.count();
  if (existingCount > 0) {
    console.log(`  Domains already exist (${existingCount}), skipping`);
    return;
  }

  await prisma.domains.createMany({ data: domainsSeedData });
  console.log(`  Created ${domainsSeedData.length} domains`);
}

async function seedTemplates(prisma: PrismaClient): Promise<void> {
  const existingCount = await prisma.templates.count();
  if (existingCount > 0) {
    console.log(`  Templates already exist (${existingCount}), skipping`);
    return;
  }

  await prisma.templates.createMany({ data: templatesSeedData });
  console.log(`  Created ${templatesSeedData.length} templates`);
}

async function seedModelConfigs(prisma: PrismaClient): Promise<void> {
  const existingCount = await prisma.model_configs.count();
  if (existingCount > 0) {
    console.log(`  Model configs already exist (${existingCount}), skipping`);
    return;
  }

  const seedApiKey = process.env.SEED_MODEL_API_KEY || process.env.IMAGE_API_KEY;
  const seedApiBaseUrl = process.env.SEED_MODEL_API_BASE_URL || process.env.IMAGE_API_BASE_URL;

  if (!seedApiKey) {
    console.log('  No API key available (SEED_MODEL_API_KEY or IMAGE_API_KEY), skipping model configs');
    return;
  }

  if (!seedApiBaseUrl) {
    console.log('  No API base URL available (SEED_MODEL_API_BASE_URL or IMAGE_API_BASE_URL), skipping model configs');
    return;
  }

  const configs = modelConfigsSeedData.map((config) => ({
    ...config,
    api_key: seedApiKey,
    api_base_url: seedApiBaseUrl.trim(),
  }));

  await prisma.model_configs.createMany({ data: configs });
  console.log(`  Created ${configs.length} model configs`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('=== Seed: Admin user ===');
  await seedAdminUser(prisma);

  console.log('=== Seed: Domains ===');
  await seedDomains(prisma);

  console.log('=== Seed: Templates ===');
  await seedTemplates(prisma);

  console.log('=== Seed: Model configs ===');
  await seedModelConfigs(prisma);

  console.log('\nSeed completed.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
