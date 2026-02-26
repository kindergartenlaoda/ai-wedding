/**
 * 阿里云 OSS 客户端
 *
 * 导出接口与原 minio-client.ts 保持一致，业务侧无需改动。
 */
import OSS from 'ali-oss';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { UploadImageOptions, UploadImageResult } from '@/types/storage';

// ── OSS 配置 ──────────────────────────────────────────────────

function getOssConfig() {
    const region = process.env.ALI_OSS_REGION;
    const accessKeyId = process.env.ALI_OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALI_OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.ALI_OSS_BUCKET;

    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
        throw new Error(
            '缺少阿里云 OSS 环境变量，请检查 ALI_OSS_REGION / ALI_OSS_ACCESS_KEY_ID / ALI_OSS_ACCESS_KEY_SECRET / ALI_OSS_BUCKET'
        );
    }

    return { region, accessKeyId, accessKeySecret, bucket };
}

// ── OSS 客户端单例 ───────────────────────────────────────────

let ossClientInstance: OSS | null = null;

export function getOssClient(): OSS {
    if (!ossClientInstance) {
        const config = getOssConfig();
        ossClientInstance = new OSS({
            region: config.region,
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            bucket: config.bucket,
        });
    }
    return ossClientInstance;
}

// ── 缩略图 ───────────────────────────────────────────────────

interface ThumbnailSize {
    suffix: string;
    width: number;
}

const THUMBNAIL_SIZES: ThumbnailSize[] = [
    { suffix: '_thumb', width: 400 },
    { suffix: '_medium', width: 800 },
];

/**
 * 为上传的图片生成 WebP 缩略图并上传到 OSS。
 * 失败时静默返回空对象，不阻塞主上传流程。
 */
async function generateThumbnails(
    buffer: Buffer,
    objectName: string,
    client: OSS,
): Promise<{ thumbnailUrl?: string; mediumUrl?: string }> {
    const result: { thumbnailUrl?: string; mediumUrl?: string } = {};

    const lastDot = objectName.lastIndexOf('.');
    const baseName = lastDot >= 0 ? objectName.substring(0, lastDot) : objectName;

    for (const size of THUMBNAIL_SIZES) {
        try {
            const resizedBuffer = await sharp(buffer)
                .resize(size.width, undefined, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            const thumbObjectName = `${baseName}${size.suffix}.webp`;

            const putResult = await client.put(thumbObjectName, resizedBuffer, {
                headers: { 'Content-Type': 'image/webp' },
            });

            const url = putResult.url;

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

// ── 上传图片 ─────────────────────────────────────────────────

export async function uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
    const client = getOssClient();
    const config = getOssConfig();

    // 生成唯一对象名
    const ext = options.originalName
        ? options.originalName.split('.').pop()
        : (options.contentType?.split('/')[1] || 'png');

    const timestamp = Date.now();
    const uuid = randomUUID();
    const folder = options.folder ? `${options.folder}/` : '';
    const objectName = `${folder}${timestamp}-${uuid}.${ext}`;

    const contentType = options.contentType || 'image/png';

    try {
        // 上传原图到 OSS
        const putResult = await client.put(objectName, options.buffer, {
            headers: { 'Content-Type': contentType },
        });

        const publicUrl = putResult.url;

        console.log(`✅ 图片上传成功: ${objectName} (${(options.buffer.length / 1024).toFixed(1)}KB)`);

        // 生成签名 URL（7 天有效期）
        const presignedUrl = client.signatureUrl(objectName, {
            expires: 7 * 24 * 60 * 60,
        });

        console.log(`✅ 签名 URL 生成成功: ${presignedUrl.substring(0, 100)}...`);

        // 异步生成缩略图
        const thumbnails = await generateThumbnails(bufferCopy(options.buffer), objectName, client);

        return {
            url: publicUrl,
            publicUrl,
            presignedUrl,
            objectName,
            bucket: config.bucket,
            ...thumbnails,
        };
    } catch (error) {
        console.error('❌ 上传图片到 OSS 失败:', error);
        throw error;
    }
}

/** 复制 Buffer 以避免 sharp 和上传共用同一 Buffer 导致问题 */
function bufferCopy(buf: Buffer): Buffer {
    const copy = Buffer.allocUnsafe(buf.length);
    buf.copy(copy);
    return copy;
}

// ── 从 base64 / dataURL 上传 ─────────────────────────────────

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

export async function uploadDataUrlImage(
    dataUrl: string,
    folder?: string
): Promise<UploadImageResult> {
    return uploadBase64Image(dataUrl, { folder });
}

// ── 从 URL 下载并上传 ─────────────────────────────────────────

export async function uploadFromUrl(
    imageUrl: string,
    folder?: string
): Promise<UploadImageResult> {
    try {
        // 下载图片
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`下载图片失败: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 从 URL 提取文件名和 Content-Type
        const contentType = response.headers.get('content-type') || 'image/png';
        const urlPath = new URL(imageUrl).pathname;
        const originalName = urlPath.split('/').pop() || 'image.png';

        return uploadImage({
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

// ── 删除图片 ─────────────────────────────────────────────────

export async function deleteImage(objectName: string): Promise<void> {
    const client = getOssClient();
    try {
        await client.delete(objectName);
        console.log(`✅ 图片删除成功: ${objectName}`);
    } catch (error) {
        console.error('❌ 删除图片失败:', error);
        throw error;
    }
}

export async function deleteImages(objectNames: string[]): Promise<void> {
    const client = getOssClient();
    try {
        await client.deleteMulti(objectNames);
        console.log(`✅ 批量删除图片成功: ${objectNames.length} 张`);
    } catch (error) {
        console.error('❌ 批量删除图片失败:', error);
        throw error;
    }
}

// ── 获取签名 URL ─────────────────────────────────────────────

export async function getPresignedUrl(
    objectName: string,
    expirySeconds: number = 3600
): Promise<string> {
    const client = getOssClient();
    try {
        const url = client.signatureUrl(objectName, { expires: expirySeconds });
        return url;
    } catch (error) {
        console.error('❌ 生成签名 URL 失败:', error);
        throw error;
    }
}
