import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { uploadImage } from '@/lib/storage-client';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/upload-template-image
 * Upload template cover image to OSS
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const result = await uploadImage({
      buffer,
      contentType: file.type,
      originalName: file.name,
      folder: 'templates',
    });

    return NextResponse.json({
      url: result.publicUrl,
      presignedUrl: result.presignedUrl,
      objectName: result.objectName,
    });
  } catch (error) {
    logger.error({ error }, 'Upload template image error');
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
