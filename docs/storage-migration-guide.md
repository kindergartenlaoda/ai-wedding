# 对象存储动态切换指南

## 概述

项目现已支持通过环境变量动态切换对象存储提供商，支持：
- **MinIO** - 自建 S3 兼容存储（默认）
- **阿里云 OSS** - 阿里云对象存储服务

## 配置方式

### 1. 环境变量配置

在 `.env` 文件中设置 `STORAGE_PROVIDER`：

```bash
# 使用 MinIO（默认）
STORAGE_PROVIDER=minio

# 或使用阿里云 OSS
STORAGE_PROVIDER=oss
```

### 2. MinIO 配置

当 `STORAGE_PROVIDER=minio` 时，需要配置以下环境变量：

```bash
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="ai-images"
MINIO_USE_SSL="false"
```

### 3. 阿里云 OSS 配置

当 `STORAGE_PROVIDER=oss` 时，需要配置以下环境变量：

```bash
ALI_OSS_REGION="oss-cn-beijing"
ALI_OSS_ACCESS_KEY_ID="your-access-key-id"
ALI_OSS_ACCESS_KEY_SECRET="your-access-key-secret"
ALI_OSS_BUCKET="your-bucket-name"
```

## 技术实现

### 统一存储接口

所有存储操作通过 `app/lib/storage-client.ts` 统一调用：

```typescript
import { uploadImage, uploadDataUrlImage, deleteImage } from '@/lib/storage-client';

// 自动路由到配置的存储提供商
const result = await uploadImage({
  buffer,
  originalName: 'photo.jpg',
  contentType: 'image/jpeg',
  folder: 'uploads',
});
```

### 动态导入机制

`storage-client.ts` 根据 `STORAGE_PROVIDER` 环境变量动态导入对应的实现：

```typescript
async function getStorageClient() {
  if (STORAGE_PROVIDER === 'oss') {
    return await import('@/lib/oss-client');
  } else {
    return await import('@/lib/minio-client');
  }
}
```

### API 统一性

两个存储客户端实现了相同的接口：

- `uploadImage(options)` - 上传图片
- `uploadBase64Image(base64Data, options)` - 从 base64 上传
- `uploadDataUrlImage(dataUrl, folder)` - 从 dataURL 上传
- `uploadFromUrl(imageUrl, folder)` - 从 URL 下载并上传
- `deleteImage(objectName)` - 删除图片
- `deleteImages(objectNames)` - 批量删除
- `getPresignedUrl(objectName, expirySeconds)` - 获取预签名 URL

## 迁移步骤

### 从 MinIO 迁移到阿里云 OSS

1. **配置阿里云 OSS**：
   ```bash
   # 在 .env 中添加
   STORAGE_PROVIDER=oss
   ALI_OSS_REGION="oss-cn-beijing"
   ALI_OSS_ACCESS_KEY_ID="your-key"
   ALI_OSS_ACCESS_KEY_SECRET="your-secret"
   ALI_OSS_BUCKET="your-bucket"
   ```

2. **重启应用**：
   ```bash
   pnpm pm2:restart
   # 或
   pnpm dev
   ```

3. **验证上传**：
   - 登录应用
   - 上传测试图片
   - 检查图片是否正确存储到阿里云 OSS

4. **迁移历史数据**（可选）：
   - 使用 `scripts/migrate-storage.ts`（待实现）
   - 或手动迁移 MinIO 中的图片到 OSS

### 从阿里云 OSS 迁移到 MinIO

1. **配置 MinIO**：
   ```bash
   # 在 .env 中修改
   STORAGE_PROVIDER=minio
   MINIO_ENDPOINT="http://your-minio-server:9000"
   MINIO_ACCESS_KEY="your-access-key"
   MINIO_SECRET_KEY="your-secret-key"
   MINIO_BUCKET_NAME="ai-images"
   MINIO_USE_SSL="false"
   ```

2. **初始化 MinIO Bucket**：
   ```bash
   pnpm fix-minio:policy
   ```

3. **重启应用**：
   ```bash
   pnpm pm2:restart
   ```

## 性能对比

| 特性 | MinIO | 阿里云 OSS |
|------|-------|-----------|
| 部署方式 | 自建服务器 | 云服务 |
| 成本 | 服务器成本 | 按量付费 |
| 带宽 | 取决于服务器 | 高带宽 |
| 可靠性 | 取决于配置 | 99.995% SLA |
| CDN 加速 | 需自建 | 原生支持 |
| 缩略图生成 | 应用层处理 | 应用层处理 |
| 预签名 URL | 支持 | 支持 |

## 注意事项

1. **环境变量优先级**：
   - 必须设置 `STORAGE_PROVIDER` 环境变量
   - 未设置时默认使用 `minio`

2. **URL 格式差异**：
   - MinIO: `http://endpoint:port/bucket/object`
   - OSS: `https://bucket.region.aliyuncs.com/object`

3. **权限配置**：
   - MinIO: 需要手动设置 bucket 公共读策略
   - OSS: 需要在阿里云控制台配置 bucket 权限

4. **SSL 证书**：
   - MinIO: 可选 SSL（`MINIO_USE_SSL`）
   - OSS: 默认 HTTPS

5. **缩略图生成**：
   - 两种存储都在应用层使用 `sharp` 生成缩略图
   - 生成 400px 和 800px 两种尺寸的 WebP 格式

## 故障排查

### MinIO 403 错误

```bash
# 修复 bucket 策略
pnpm fix-minio:policy

# 刷新图片 URL
pnpm fix-minio:urls
```

### OSS 权限错误

1. 检查 AccessKey 是否正确
2. 检查 bucket 是否存在
3. 检查 RAM 用户权限（需要 `oss:PutObject`, `oss:GetObject`, `oss:DeleteObject`）

### 上传失败

1. 检查环境变量配置
2. 查看应用日志：`pnpm pm2:logs`
3. 验证网络连接
4. 检查存储空间配额

## 相关文件

- `app/lib/storage-client.ts` - 统一存储客户端
- `app/lib/minio-client.ts` - MinIO 实现
- `app/lib/oss-client.ts` - 阿里云 OSS 实现
- `app/api/upload-image/route.ts` - 上传 API
- `app/types/storage.ts` - 存储类型定义
- `.env.example` - 环境变量示例

## 未来扩展

可以继续添加其他存储提供商：

1. **AWS S3**：
   - 创建 `app/lib/s3-client.ts`
   - 实现相同的接口
   - 添加 `STORAGE_PROVIDER=s3` 支持

2. **腾讯云 COS**：
   - 创建 `app/lib/cos-client.ts`
   - 添加 `STORAGE_PROVIDER=cos` 支持

3. **七牛云 Kodo**：
   - 创建 `app/lib/kodo-client.ts`
   - 添加 `STORAGE_PROVIDER=kodo` 支持
