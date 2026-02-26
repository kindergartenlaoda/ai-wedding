#!/usr/bin/env tsx
/**
 * 测试存储提供商动态切换功能
 *
 * 用法：
 *   pnpm test:storage
 *   STORAGE_PROVIDER=minio pnpm test:storage
 *   STORAGE_PROVIDER=oss pnpm test:storage
 */

// 加载 .env 文件
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载项目根目录的 .env 文件
config({ path: resolve(__dirname, '../.env') });

import { getStorageProvider } from '../app/lib/storage-client';

async function testStorageSwitch() {
  console.log('🧪 测试存储提供商动态切换\n');

  // 1. 检查环境变量
  const envProvider = process.env.STORAGE_PROVIDER || 'minio';
  console.log(`📋 环境变量 STORAGE_PROVIDER: ${envProvider}`);

  // 2. 获取实际使用的提供商
  const actualProvider = getStorageProvider();
  console.log(`✅ 实际使用的提供商: ${actualProvider}\n`);

  // 3. 验证配置
  if (actualProvider === 'minio') {
    console.log('🔧 MinIO 配置检查:');
    console.log(`   MINIO_ENDPOINT: ${process.env.MINIO_ENDPOINT || '未配置'}`);
    console.log(`   MINIO_ACCESS_KEY: ${process.env.MINIO_ACCESS_KEY ? '已配置' : '未配置'}`);
    console.log(`   MINIO_SECRET_KEY: ${process.env.MINIO_SECRET_KEY ? '已配置' : '未配置'}`);
    console.log(`   MINIO_BUCKET_NAME: ${process.env.MINIO_BUCKET_NAME || '未配置'}`);
    console.log(`   MINIO_USE_SSL: ${process.env.MINIO_USE_SSL || 'false'}`);
  } else {
    console.log('🔧 阿里云 OSS 配置检查:');
    console.log(`   ALI_OSS_REGION: ${process.env.ALI_OSS_REGION || '未配置'}`);
    console.log(`   ALI_OSS_ACCESS_KEY_ID: ${process.env.ALI_OSS_ACCESS_KEY_ID ? '已配置' : '未配置'}`);
    console.log(`   ALI_OSS_ACCESS_KEY_SECRET: ${process.env.ALI_OSS_ACCESS_KEY_SECRET ? '已配置' : '未配置'}`);
    console.log(`   ALI_OSS_BUCKET: ${process.env.ALI_OSS_BUCKET || '未配置'}`);
  }

  console.log('\n✨ 测试完成！');
  console.log('\n💡 提示:');
  console.log('   - 修改 .env 中的 STORAGE_PROVIDER 可切换存储提供商');
  console.log('   - minio: 使用自建 MinIO 存储');
  console.log('   - oss: 使用阿里云 OSS 存储');
}

testStorageSwitch().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
