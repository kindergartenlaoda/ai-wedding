/**
 * 统一存储客户端 - 动态切换 MinIO / 阿里云 OSS
 *
 * 通过环境变量 STORAGE_PROVIDER 控制：
 * - "minio" - 使用 MinIO (默认)
 * - "oss" - 使用阿里云 OSS
 */

import type { UploadImageOptions, UploadImageResult } from '@/types/storage';

/**
 * 获取存储提供商配置（延迟读取，确保环境变量已加载）
 */
function getStorageProviderConfig(): 'minio' | 'oss' {
  const provider = (process.env.STORAGE_PROVIDER || 'minio').toLowerCase();
  return provider === 'oss' ? 'oss' : 'minio';
}

/**
 * 动态导入对应的存储客户端
 */
async function getStorageClient() {
  const provider = getStorageProviderConfig();

  if (provider === 'oss') {
    return await import('@/lib/oss-client');
  } else {
    return await import('@/lib/minio-client');
  }
}

/**
 * 上传图片（自动路由到配置的存储提供商）
 */
export async function uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
  const client = await getStorageClient();
  return client.uploadImage(options);
}

/**
 * 从 base64 上传图片
 */
export async function uploadBase64Image(
  base64Data: string,
  options?: Omit<UploadImageOptions, 'buffer'>
): Promise<UploadImageResult> {
  const client = await getStorageClient();
  return client.uploadBase64Image(base64Data, options);
}

/**
 * 从 dataURL 上传图片
 */
export async function uploadDataUrlImage(
  dataUrl: string,
  folder?: string
): Promise<UploadImageResult> {
  const client = await getStorageClient();
  return client.uploadDataUrlImage(dataUrl, folder);
}

/**
 * 从 URL 下载并上传
 */
export async function uploadFromUrl(
  imageUrl: string,
  folder?: string
): Promise<UploadImageResult> {
  const client = await getStorageClient();
  const provider = getStorageProviderConfig();

  // OSS 客户端有原生 uploadFromUrl
  if (provider === 'oss' && 'uploadFromUrl' in client) {
    return client.uploadFromUrl(imageUrl, folder);
  }

  // MinIO 客户端没有 uploadFromUrl，手动实现
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get('content-type') || 'image/png';
    const urlPath = new URL(imageUrl).pathname;
    const originalName = urlPath.split('/').pop() || 'image.png';

    return client.uploadImage({
      buffer,
      contentType,
      originalName,
      folder,
    });
  } catch (error) {
    console.error('❌ 从 URL 上传图片失败:', error);
    throw error;
  }
}

/**
 * 删除图片
 */
export async function deleteImage(objectName: string): Promise<void> {
  const client = await getStorageClient();
  return client.deleteImage(objectName);
}

/**
 * 批量删除图片
 */
export async function deleteImages(objectNames: string[]): Promise<void> {
  const client = await getStorageClient();
  return client.deleteImages(objectNames);
}

/**
 * 获取预签名 URL
 */
export async function getPresignedUrl(
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  const client = await getStorageClient();
  return client.getPresignedUrl(objectName, expirySeconds);
}

/**
 * 获取当前存储提供商
 */
export function getStorageProvider(): 'minio' | 'oss' {
  return getStorageProviderConfig();
}
