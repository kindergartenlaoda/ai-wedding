import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { GenerationWithRelations } from '@/types/database';

/**
 * PATCH /api/generations/[id]
 * Update generation (status, preview_images, etc.)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.generation.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updateData: Parameters<typeof prisma.generation.update>[0]['data'] = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.preview_images !== undefined) updateData.previewImages = body.preview_images;
  if (body.high_res_images !== undefined) updateData.highResImages = body.high_res_images;
  if (body.error_message !== undefined) updateData.errorMessage = body.error_message;
  if (body.completed_at !== undefined) updateData.completedAt = new Date(body.completed_at);

  await prisma.generation.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

/**
 * GET /api/generations/[id]
 * Fetch single generation with project and template (for polling)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { id } = await context.params;

  const generation = await prisma.generation.findFirst({
    where: { id, userId },
    include: {
      project: { select: { name: true, uploadedPhotos: true } },
      template: { select: { name: true } },
    },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result: GenerationWithRelations = {
    id: generation.id,
    status: generation.status,
    preview_images: Array.isArray(generation.previewImages) ? (generation.previewImages as string[]) : [],
    high_res_images: Array.isArray(generation.highResImages) ? (generation.highResImages as string[]) : [],
    error_message: generation.errorMessage ?? undefined,
    is_shared_to_gallery: generation.isSharedToGallery,
    completed_at: generation.completedAt?.toISOString(),
    project: {
      name: generation.project?.name || '',
      uploaded_photos: Array.isArray(generation.project?.uploadedPhotos)
        ? (generation.project.uploadedPhotos as string[])
        : undefined,
    },
    template: {
      name: generation.template?.name || '',
    },
  };

  return NextResponse.json(result);
}
