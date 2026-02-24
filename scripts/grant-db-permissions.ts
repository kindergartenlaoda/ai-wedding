/**
 * 使用 postgres 管理员账号为 widding 用户授予 public schema 权限
 *
 * 用法:
 *   1. 在 .env 中添加: PG_ADMIN_PASSWORD=你的postgres密码
 *   2. 运行: pnpm run grant-db-permissions
 *
 * 注意: PG_ADMIN_PASSWORD 不要提交到 Git，.env 已在 .gitignore 中
 */

import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const adminPassword = process.env.PG_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('❌ 请在 .env 中设置 PG_ADMIN_PASSWORD（postgres 管理员密码）');
    process.exit(1);
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error('❌ 请在 .env 中设置 DATABASE_URL');
    process.exit(1);
  }

  // 将 DATABASE_URL 中的用户密码替换为 postgres 管理员
  // 格式: postgresql://user:pass@host:port/database
  const adminUrl = baseUrl.replace(
    /^postgresql:\/\/([^:]+):([^@]+)@/,
    `postgresql://postgres:${encodeURIComponent(adminPassword)}@`
  );

  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    console.log('✅ 已使用 postgres 管理员连接数据库');

    const grants = [
      'GRANT ALL ON SCHEMA public TO widding',
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO widding',
      'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO widding',
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO widding',
    ];

    for (const sql of grants) {
      try {
        await client.query(sql);
        console.log(`✅ ${sql}`);
      } catch (err) {
        console.error(`❌ 执行失败: ${sql}`);
        console.error((err as Error).message);
        process.exit(1);
      }
    }

    console.log('\n✅ 权限授予完成，可运行 pnpm run verify-db 验证');
  } catch (err) {
    console.error('❌ 连接失败:', (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
