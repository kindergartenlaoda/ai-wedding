import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { MinioConfig, UploadImageOptions, UploadImageResult } from '@/types/storage';

// 从环境变量获取 MinIO 配置
function getMinioConfig(): MinioConfig {
  const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const bucketName = process.env.MINIO_BUCKET_NAME || 'ai-images';
  const useSSL = process.env.MINIO_USE_SSL === 'true';

  // MINIO_INTERNAL_ENDPOINT 用于 Docker 容器内 SDK 连接（如 http://minio:9000）
  // MINIO_ENDPOINT 用于生成浏览器可访问的图片 URL
  const internalEndpoint = process.env.MINIO_INTERNAL_ENDPOINT || endpoint;

  const endpointUrl = new URL(internalEndpoint);
  const endpointHost = endpointUrl.hostname;
  const endpointPort = endpointUrl.port ? parseInt(endpointUrl.port) : (useSSL ? 443 : 9000);

  return {
    endpoint: endpointHost,
    port: endpointPort,
    accessKey,
    secretKey,
    useSSL,
    bucketName,
  };
}

function getPublicEndpoint(): { host: string; port: number; useSSL: boolean } {
  const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const url = new URL(endpoint);
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port) : (useSSL ? 443 : 9000),
    useSSL,
  };
}

// 创建 MinIO 客户端单例
let minioClientInstance: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!minioClientInstance) {
    const config = getMinioConfig();

    minioClientInstance = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  return minioClientInstance;
}

// 确保 bucket 存在
export async function ensureBucketExists(): Promise<void> {
  const client = getMinioClient();
  const config = getMinioConfig();
  const bucketName = config.bucketName;

  try {
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Bucket "${bucketName}" 创建成功`);

      // 设置公共读策略
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ Bucket "${bucketName}" 策略设置成功`);
    }
  } catch (error) {
    console.error('❌ 确保 bucket 存在时出错:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 缩略图生成
// ---------------------------------------------------------------------------

interface ThumbnailSize {
  suffix: string;
  width: number;
}

const THUMBNAIL_SIZES: ThumbnailSize[] = [
  { suffix: '_thumb', width: 400 },
  { suffix: '_medium', width: 800 },
];

/**
 * 为上传的图片生成缩略图（WebP 格式）。
 * 返回 { _thumb: url, _medium: url } 的映射。
 * 失败时静默返回空对象，不阻塞主上传流程。
 */
async function generateThumbnails(
  buffer: Buffer,
  objectName: string,
  client: Minio.Client,
  bucketName: string,
): Promise<{ thumbnailUrl?: string; mediumUrl?: string }> {
  const result: { thumbnailUrl?: string; mediumUrl?: string } = {};

  // 提取不带扩展名的基础名称
  const lastDot = objectName.lastIndexOf('.');
  const baseName = lastDot >= 0 ? objectName.substring(0, lastDot) : objectName;

  const pub = getPublicEndpoint();
  const protocol = pub.useSSL ? 'https' : 'http';
  const port = pub.port === 80 || pub.port === 443 ? '' : `:${pub.port}`;

  for (const size of THUMBNAIL_SIZES) {
    try {
      const resizedBuffer = await sharp(buffer)
        .resize(size.width, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const thumbObjectName = `${baseName}${size.suffix}.webp`;

      await client.putObject(
        bucketName,
        thumbObjectName,
        resizedBuffer,
        resizedBuffer.length,
        { 'Content-Type': 'image/webp' },
      );

      const url = `${protocol}://${pub.host}${port}/${bucketName}/${thumbObjectName}`;

      if (size.suffix === '_thumb') {
        result.thumbnailUrl = url;
      } else {
        result.mediumUrl = url;
      }

      console.log(
        `✅ 缩略图生成完成: ${thumbObjectName} (${size.width}px, ${(resizedBuffer.length / 1024).toFixed(1)}KB)`,
      );
    } catch (err) {
      console.warn(`⚠️ 生成 ${size.suffix} 缩略图失败（不影响主流程）:`, err);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 上传图片到 MinIO
// ---------------------------------------------------------------------------
export async function uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
  const client = getMinioClient();
  const config = getMinioConfig();
  const bucketName = config.bucketName;

  // 确保 bucket 存在
  await ensureBucketExists();

  // 生成唯一的对象名称
  const ext = options.originalName
    ? options.originalName.split('.').pop()
    : (options.contentType?.split('/')[1] || 'png');

  const timestamp = Date.now();
  const uuid = randomUUID();
  const folder = options.folder ? `${options.folder}/` : '';
  const objectName = `${folder}${timestamp}-${uuid}.${ext}`;

  // 确定 Content-Type
  const contentType = options.contentType || 'image/png';

  try {
    // 上传原图到 MinIO
    await client.putObject(
      bucketName,
      objectName,
      options.buffer,
      options.buffer.length,
      {
        'Content-Type': contentType,
      }
    );

    console.log(`✅ 图片上传成功: ${objectName} (${(options.buffer.length / 1024).toFixed(1)}KB)`);

    const pub = getPublicEndpoint();
    const protocol = pub.useSSL ? 'https' : 'http';
    const portStr = pub.port === 80 || pub.port === 443 ? '' : `:${pub.port}`;
    const publicUrl = `${protocol}://${pub.host}${portStr}/${bucketName}/${objectName}`;

    // 生成预签名 URL（7天有效期）
    const presignedUrl = await client.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60);

    console.log(`✅ 预签名 URL 生成成功: ${presignedUrl.substring(0, 100)}...`);

    // 异步生成缩略图（不阻塞主流程返回）
    const thumbnails = await generateThumbnails(buffer_copy(options.buffer), objectName, client, bucketName);

    return {
      url: publicUrl,
      publicUrl,
      presignedUrl,
      objectName,
      bucket: bucketName,
      ...thumbnails,
    };
  } catch (error) {
    console.error('❌ 上传图片到 MinIO 失败:', error);
    throw error;
  }
}

/** 复制 Buffer 以避免 sharp 和上传共用同一 Buffer 引发问题 */
function buffer_copy(buf: Buffer): Buffer {
  const copy = Buffer.allocUnsafe(buf.length);
  buf.copy(copy);
  return copy;
}

// 从 base64 字符串上传图片
export async function uploadBase64Image(
  base64Data: string,
  options?: Omit<UploadImageOptions, 'buffer'>
): Promise<UploadImageResult> {
  const commaIdx = base64Data.indexOf(',');
  if (commaIdx === -1 || !base64Data.startsWith('data:image/')) {
    throw new Error('无效的 base64 图片数据');
  }

  const header = base64Data.slice(0, commaIdx);
  const typeMatch = header.match(/^data:image\/([a-zA-Z0-9.+-]+);base64$/);
  if (!typeMatch) {
    throw new Error('无效的 base64 图片数据');
  }

  const imageType = typeMatch[1];
  const base64String = base64Data.slice(commaIdx + 1);
  const buffer = Buffer.from(base64String, 'base64');

  return uploadImage({
    buffer,
    contentType: `image/${imageType}`,
    originalName: options?.originalName,
    folder: options?.folder,
  });
}

// 从 dataURL 上传图片
export async function uploadDataUrlImage(
  dataUrl: string,
  folder?: string
): Promise<UploadImageResult> {
  return uploadBase64Image(dataUrl, { folder });
}

// 删除图片
export async function deleteImage(objectName: string): Promise<void> {
  const client = getMinioClient();
  const config = getMinioConfig();
  const bucketName = config.bucketName;

  try {
    await client.removeObject(bucketName, objectName);
    console.log(`✅ 图片删除成功: ${objectName}`);
  } catch (error) {
    console.error('❌ 删除图片失败:', error);
    throw error;
  }
}

// 批量删除图片
export async function deleteImages(objectNames: string[]): Promise<void> {
  const client = getMinioClient();
  const config = getMinioConfig();
  const bucketName = config.bucketName;

  try {
    await client.removeObjects(bucketName, objectNames);
    console.log(`✅ 批量删除图片成功: ${objectNames.length} 张`);
  } catch (error) {
    console.error('❌ 批量删除图片失败:', error);
    throw error;
  }
}

// 获取图片的预签名 URL（用于临时访问）
export async function getPresignedUrl(
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = getMinioClient();
  const config = getMinioConfig();
  const bucketName = config.bucketName;

  try {
    const url = await client.presignedGetObject(bucketName, objectName, expirySeconds);
    return url;
  } catch (error) {
    console.error('❌ 生成预签名 URL 失败:', error);
    throw error;
  }
}
