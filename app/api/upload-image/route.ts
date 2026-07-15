import { NextResponse } from 'next/server';
import { uploadDataUrlImage, uploadImage } from '@/lib/storage-client';
import { getSessionUser } from '@/lib/auth-api';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';

const LOCAL_ADMIN_MODE = process.env.LOCAL_ADMIN_MODE === 'true';

export async function POST(req: Request) {
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('upload-image', requestId);

  log.info('开始处理图片上传请求');

  try {
    // 1) 可选的认证校验（从 NextAuth session/cookies）
    const user = await getSessionUser();
    if (user) {
      log.info({ userId: user.id }, '用户认证成功');
    } else {
      log.warn('未登录，允许匿名上传');
    }

    // 2) 解析请求体
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON 格式：包含 base64、dataURL 或 URL
      const body = await req.json();
      log.debug('收到 JSON 格式上传请求');

      const { image, folder } = body;

      if (!image || typeof image !== 'string') {
        log.error('缺少 image 字段');
        return NextResponse.json(
          { error: '缺少 image 字段' },
          { status: 400 }
        );
      }

      // 判断是 URL 还是 base64
      let result;
      try {
        if (image.startsWith('http://') || image.startsWith('https://')) {
          log.debug('检测到 URL 格式，从远程下载');
          const { uploadFromUrl } = await import('@/lib/storage-client');
          result = await uploadFromUrl(image, folder || 'uploads');
        } else {
          log.debug('检测到 base64/dataURL 格式');
          result = await uploadDataUrlImage(image, folder || 'uploads');
        }
      } catch (storageError) {
        if (!LOCAL_ADMIN_MODE) throw storageError;
        log.warn({ error: storageError instanceof Error ? storageError.message : 'Unknown' }, '对象存储不可用，使用原图回退');
        return NextResponse.json({
          success: true,
          fallback: true,
          url: image,
          publicUrl: image,
          presignedUrl: image,
          objectName: null,
          bucket: null,
          thumbnailUrl: image,
          mediumUrl: image,
        });
      }

      log.info({ url: result.url }, '图片上传成功');

      return NextResponse.json({
        success: true,
        url: result.url,
        publicUrl: result.publicUrl,
        presignedUrl: result.presignedUrl,
        objectName: result.objectName,
        bucket: result.bucket,
        thumbnailUrl: result.thumbnailUrl,
        mediumUrl: result.mediumUrl,
      });

    } else if (contentType.includes('multipart/form-data')) {
      // FormData 格式：包含二进制文件
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const folder = formData.get('folder') as string || 'uploads';

      if (!file) {
        log.error('缺少 file 字段');
        return NextResponse.json(
          { error: '缺少 file 字段' },
          { status: 400 }
        );
      }

      log.debug({ fileName: file.name, fileSize: file.size }, '收到文件上传请求');

      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 上传到 OSS
      try {
        const result = await uploadImage({
          buffer,
          originalName: file.name,
          contentType: file.type || 'image/png',
          folder,
        });

        log.info({ url: result.url }, '图片上传成功');

        return NextResponse.json({
          success: true,
          url: result.url,
          publicUrl: result.publicUrl,
          presignedUrl: result.presignedUrl,
          objectName: result.objectName,
          bucket: result.bucket,
          thumbnailUrl: result.thumbnailUrl,
          mediumUrl: result.mediumUrl,
        });
      } catch (storageError) {
        if (!LOCAL_ADMIN_MODE) throw storageError;
        const mimeType = file.type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
        log.warn({ error: storageError instanceof Error ? storageError.message : 'Unknown' }, '对象存储不可用，使用本地 data URL 回退');
        return NextResponse.json({
          success: true,
          fallback: true,
          url: dataUrl,
          publicUrl: dataUrl,
          presignedUrl: dataUrl,
          objectName: null,
          bucket: null,
          thumbnailUrl: dataUrl,
          mediumUrl: dataUrl,
        });
      }

    } else {
      log.error({ contentType }, '不支持的 Content-Type');
      return NextResponse.json(
        { error: `不支持的 Content-Type: ${contentType}` },
        { status: 400 }
      );
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    const stack = error instanceof Error ? error.stack : undefined;
    log.error({ error: message, stack }, '上传失败');
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
