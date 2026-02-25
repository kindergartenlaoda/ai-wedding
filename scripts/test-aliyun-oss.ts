/**
 * 阿里云 OSS 连接测试脚本
 *
 * 使用方式：
 *   npx tsx scripts/test-aliyun-oss.ts
 *
 * 需要在 .env 中配置以下环境变量：
 *   ALI_OSS_REGION          - 地域节点（如 oss-cn-hangzhou）
 *   ALI_OSS_ACCESS_KEY_ID   - AccessKey ID
 *   ALI_OSS_ACCESS_KEY_SECRET - AccessKey Secret
 *   ALI_OSS_BUCKET          - Bucket 名称
 */
import 'dotenv/config';
import OSS from 'ali-oss';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ── 读取环境变量 ──────────────────────────────────────────────

const region = process.env.ALI_OSS_REGION;
const accessKeyId = process.env.ALI_OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALI_OSS_ACCESS_KEY_SECRET;
const bucket = process.env.ALI_OSS_BUCKET;

if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    console.error('❌ 请先在 .env 中配置以下变量：');
    console.error('   ALI_OSS_REGION');
    console.error('   ALI_OSS_ACCESS_KEY_ID');
    console.error('   ALI_OSS_ACCESS_KEY_SECRET');
    console.error('   ALI_OSS_BUCKET');
    process.exit(1);
}

// ── 创建 OSS 客户端 ──────────────────────────────────────────

const client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
});

// ── 测试函数 ──────────────────────────────────────────────────

async function testListBuckets() {
    console.log('\n📦 测试 1: 列出所有 Bucket');
    console.log('─'.repeat(40));
    try {
        const result = await client.listBuckets({}) as any;
        const buckets = result.buckets ?? result ?? [];
        console.log(`✅ 共找到 ${buckets.length} 个 Bucket：`);
        buckets.forEach((b: { name: string; region: string; creationDate: string }) => {
            console.log(`   - ${b.name}  (${b.region})  创建于 ${b.creationDate}`);
        });
    } catch (err: any) {
        console.error('❌ 列出 Bucket 失败:', err.message);
    }
}

async function testUpload() {
    console.log('\n📤 测试 2: 上传测试文件');
    console.log('─'.repeat(40));

    const objectName = `test/${Date.now()}-${randomUUID().slice(0, 8)}.txt`;
    const content = `Hello from ai-wedding OSS test!\nTimestamp: ${new Date().toISOString()}`;

    try {
        const result = await client.put(objectName, Buffer.from(content));
        console.log(`✅ 上传成功！`);
        console.log(`   Object: ${result.name}`);
        console.log(`   URL:    ${result.url}`);
        return objectName;
    } catch (err: any) {
        console.error('❌ 上传失败:', err.message);
        return null;
    }
}

async function testUploadImage() {
    console.log('\n🖼️  测试 3: 上传测试图片 (Buffer)');
    console.log('─'.repeat(40));

    // 创建一个 1x1 的红色 PNG 作为测试
    const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
    );

    const objectName = `test/${Date.now()}-${randomUUID().slice(0, 8)}.png`;

    try {
        const result = await client.put(objectName, pngBuffer, {
            headers: { 'Content-Type': 'image/png' },
        });
        console.log(`✅ 图片上传成功！`);
        console.log(`   Object: ${result.name}`);
        console.log(`   URL:    ${result.url}`);
        return objectName;
    } catch (err: any) {
        console.error('❌ 图片上传失败:', err.message);
        return null;
    }
}

async function testDownload(objectName: string) {
    console.log('\n📥 测试 4: 下载并验证文件');
    console.log('─'.repeat(40));

    try {
        const result = await client.get(objectName);
        const content = result.content.toString();
        console.log(`✅ 下载成功！内容：`);
        console.log(`   ${content.split('\n').join('\n   ')}`);
    } catch (err: any) {
        console.error('❌ 下载失败:', err.message);
    }
}

async function testSignatureUrl(objectName: string) {
    console.log('\n🔗 测试 5: 生成签名 URL（1 小时有效）');
    console.log('─'.repeat(40));

    try {
        const url = client.signatureUrl(objectName, { expires: 3600 });
        console.log(`✅ 签名 URL：`);
        console.log(`   ${url}`);
    } catch (err: any) {
        console.error('❌ 生成签名 URL 失败:', err.message);
    }
}

async function testList() {
    console.log('\n📋 测试 6: 列出 test/ 目录下文件');
    console.log('─'.repeat(40));

    try {
        const result = await client.list({ prefix: 'test/', 'max-keys': 10 }, {});
        console.log(`✅ 找到 ${result.objects?.length ?? 0} 个文件：`);
        result.objects?.forEach((obj: { name: string; size: number; lastModified: string }) => {
            console.log(`   - ${obj.name}  (${(obj.size / 1024).toFixed(1)} KB)  ${obj.lastModified}`);
        });
    } catch (err: any) {
        console.error('❌ 列出文件失败:', err.message);
    }
}

async function testDelete(objectNames: string[]) {
    console.log('\n🗑️  测试 7: 清理测试文件');
    console.log('─'.repeat(40));

    for (const name of objectNames) {
        try {
            await client.delete(name);
            console.log(`✅ 已删除: ${name}`);
        } catch (err: any) {
            console.error(`❌ 删除失败 ${name}:`, err.message);
        }
    }
}

// ── 执行所有测试 ──────────────────────────────────────────────

async function main() {
    console.log('🚀 阿里云 OSS 连接测试');
    console.log('═'.repeat(50));
    console.log(`  Region:  ${region}`);
    console.log(`  Bucket:  ${bucket}`);
    console.log('═'.repeat(50));

    // 1. 列出 Bucket
    await testListBuckets();

    // 2. 上传文本文件
    const textObject = await testUpload();

    // 3. 上传图片
    const imageObject = await testUploadImage();

    // 4. 下载验证
    if (textObject) {
        await testDownload(textObject);
    }

    // 5. 签名 URL
    if (textObject) {
        await testSignatureUrl(textObject);
    }

    // 6. 列出文件
    await testList();

    // 7. 清理
    const toDelete = [textObject, imageObject].filter(Boolean) as string[];
    if (toDelete.length > 0) {
        await testDelete(toDelete);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ 所有测试完成！');
    console.log('═'.repeat(50));
}

main().catch((err) => {
    console.error('\n💥 测试过程中发生未捕获的错误:', err);
    process.exit(1);
});
