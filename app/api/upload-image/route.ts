import { NextResponse } from 'next/server';
import { uploadDataUrlImage, uploadImage } from '@/lib/minio-client';
import { getSessionUser } from '@/lib/auth-api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ========== 开始处理图片上传请求 ==========`);

  try {
    // 1) 可选的认证校验（从 NextAuth session/cookies）
    const user = await getSessionUser();
    if (user) {
      console.log(`[${requestId}] ✅ 用户认证成功: ${user.id}`);
    } else {
      console.log(`[${requestId}] ⚠️ 未登录，允许匿名上传`);
    }

    // 2) 解析请求体
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON 格式：包含 base64 或 dataURL
      const body = await req.json();
      console.log(`[${requestId}] 收到 JSON 格式上传请求`);

      const { image, folder } = body;

      if (!image || typeof image !== 'string') {
        console.error(`[${requestId}] ❌ 缺少 image 字段`);
        return NextResponse.json(
          { error: '缺少 image 字段' },
          { status: 400 }
        );
      }

      // 上传到 MinIO
      const result = await uploadDataUrlImage(image, folder || 'uploads');
      
      console.log(`[${requestId}] ✅ 图片上传成功: ${result.url}`);
      console.log(`[${requestId}] ========== 请求处理完成 ==========`);

      return NextResponse.json({
        success: true,
        url: result.url, // 预签名 URL（推荐使用）
        publicUrl: result.publicUrl, // 公共 URL（可能不可用）
        presignedUrl: result.presignedUrl, // 预签名 URL
        objectName: result.objectName,
        bucket: result.bucket,
      });

    } else if (contentType.includes('multipart/form-data')) {
      // FormData 格式：包含二进制文件
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const folder = formData.get('folder') as string || 'uploads';

      if (!file) {
        console.error(`[${requestId}] ❌ 缺少 file 字段`);
        return NextResponse.json(
          { error: '缺少 file 字段' },
          { status: 400 }
        );
      }

      console.log(`[${requestId}] 收到文件上传请求: ${file.name}, ${file.size} bytes`);

      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 上传到 MinIO
      const result = await uploadImage({
        buffer,
        originalName: file.name,
        contentType: file.type || 'image/png',
        folder,
      });

      console.log(`[${requestId}] ✅ 图片上传成功: ${result.url}`);
      console.log(`[${requestId}] ========== 请求处理完成 ==========`);

      return NextResponse.json({
        success: true,
        url: result.url, // 预签名 URL（推荐使用）
        publicUrl: result.publicUrl, // 公共 URL（可能不可用）
        presignedUrl: result.presignedUrl, // 预签名 URL
        objectName: result.objectName,
        bucket: result.bucket,
      });

    } else {
      console.error(`[${requestId}] ❌ 不支持的 Content-Type: ${contentType}`);
      return NextResponse.json(
        { error: `不支持的 Content-Type: ${contentType}` },
        { status: 400 }
      );
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] ❌ 上传失败:`, {
      message,
      stack,
      error,
    });
    console.error(`[${requestId}] ========== 请求处理失败 ==========`);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

