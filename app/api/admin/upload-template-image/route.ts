import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { uploadImage } from '@/lib/storage-client';
import { logger } from '@/lib/logger';
import { Semaphore } from 'async-mutex';
import { MAX_CONCURRENT_UPLOADS } from '@/lib/upload-limits';

/**
 * Global semaphore to limit concurrent uploads
 * Maximum concurrent uploads configured in upload-limits.ts
 */
const uploadSemaphore = new Semaphore(MAX_CONCURRENT_UPLOADS);

/**
 * POST /api/admin/upload-template-image
 * Upload template cover image to OSS
 *
 * Concurrency Control:
 * - Maximum 3 concurrent uploads
 * - Prevents memory exhaustion from large file uploads
 * - Returns 503 if semaphore acquisition times out
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const authResult = await requireAdmin(req);

  if (authResult instanceof Response) {
    return authResult;
  }

  const { profile } = authResult;

  // Log upload attempt
  logger.info({
    userId: profile.user_id,
    action: 'upload_attempt',
    waitingSlots: uploadSemaphore.getValue(),
  }, 'Upload request received');

  // Acquire semaphore (blocks if all slots are busy)
  const [value, release] = await uploadSemaphore.acquire();

  try {
    // Log semaphore acquisition
    logger.info({
      userId: profile.user_id,
      semaphoreValue: value,
      waitTime: Date.now() - startTime,
    }, 'Semaphore acquired');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Log file info
    logger.info({
      userId: profile.user_id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }, 'Processing file upload');

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

    // Upload to storage
    let result: Awaited<ReturnType<typeof uploadImage>>;
    try {
      result = await uploadImage({
        buffer,
        contentType: file.type,
        originalName: file.name,
        folder: 'templates',
      });
    } catch (uploadError) {
      if (process.env.LOCAL_ADMIN_MODE === 'true' && profile.user_id === 'local-admin') {
        const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
        logger.warn({ error: uploadError, userId: profile.user_id }, 'Storage unavailable, using local data URL');
        return NextResponse.json({
          url: dataUrl,
          presignedUrl: dataUrl,
          objectName: `local-template-${Date.now()}-${file.name}`,
          local: true,
        });
      }
      throw uploadError;
    }

    // Log successful upload
    const duration = Date.now() - startTime;
    logger.info({
      userId: profile.user_id,
      fileName: file.name,
      fileSize: file.size,
      duration,
      objectName: result.objectName,
    }, 'Upload completed successfully');

    return NextResponse.json({
      url: result.publicUrl,
      presignedUrl: result.presignedUrl,
      objectName: result.objectName,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      error,
      userId: profile.user_id,
      duration,
    }, 'Upload template image error');

    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Always release the semaphore, even if an error occurred
    release();

    // Log semaphore release
    logger.debug({
      userId: profile.user_id,
      availableSlots: uploadSemaphore.getValue(),
    }, 'Semaphore released');
  }
}
