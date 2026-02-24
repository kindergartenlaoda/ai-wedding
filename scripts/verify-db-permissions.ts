/**
 * PostgreSQL 权限验证脚本
 *
 * 验证 DATABASE_URL 对应的数据库用户是否具备 Prisma 迁移所需的权限：
 * 1. 连接数据库
 * 2. 在 public schema 创建/删除表（prisma migrate deploy 需要）
 * 3. 可选：创建数据库（prisma migrate dev 的 shadow database 需要）
 *
 * 用法: pnpm exec tsx scripts/verify-db-permissions.ts
 */

import 'dotenv/config';
import { Client } from 'pg';

const TEST_TABLE = '_prisma_verify_test_' + Date.now();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL 未设置，请在 .env 中配置');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    console.log('✅ 1. 数据库连接成功');

    // 测试 2: 在 public schema 创建表
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public."${TEST_TABLE}" (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('✅ 2. 在 public schema 创建表成功');
    } catch (err) {
      console.error('❌ 2. 在 public schema 创建表失败:', (err as Error).message);
      process.exit(1);
    }

    // 测试 3: 插入数据
    try {
      await client.query(
        `INSERT INTO public."${TEST_TABLE}" (id) VALUES ($1)`,
        ['test-row']
      );
      console.log('✅ 3. 插入数据成功');
    } catch (err) {
      console.error('❌ 3. 插入数据失败:', (err as Error).message);
      await cleanup(client);
      process.exit(1);
    }

    // 测试 4: 删除表
    try {
      await client.query(`DROP TABLE IF EXISTS public."${TEST_TABLE}"`);
      console.log('✅ 4. 删除表成功');
    } catch (err) {
      console.error('❌ 4. 删除表失败:', (err as Error).message);
      process.exit(1);
    }

    // 测试 5: 创建数据库（shadow database，仅 migrate dev 需要）
    const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? 'widding';
    const shadowDbName = `${dbName}_shadow_${Date.now()}`;

    try {
      await client.query(`CREATE DATABASE "${shadowDbName}"`);
      await client.query(`DROP DATABASE "${shadowDbName}"`);
      console.log('✅ 5. 创建/删除数据库成功（migrate dev 可用）');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('permission denied') || msg.includes('CREATE DATABASE')) {
        console.warn(
          '⚠️  5. 无法创建数据库（migrate dev 的 shadow database 需要此权限）'
        );
        console.warn('    可使用 prisma migrate deploy 代替 migrate dev');
      } else {
        console.error('❌ 5. 创建数据库异常:', msg);
      }
    }

    console.log('\n✅ 权限验证通过，可执行 prisma migrate deploy');
  } catch (err) {
    console.error('❌ 连接失败:', (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function cleanup(client: Client) {
  try {
    await client.query(`DROP TABLE IF EXISTS public."${TEST_TABLE}"`);
  } catch {
    // ignore
  }
}

main();
