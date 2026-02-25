import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { mapGenerationWithRelations } from '@/lib/generation-mapper';

/**
 * PATCH /api/generations/[id]
 * Update generation (status, images, etc.)
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
  if (body.error_message !== undefined) updateData.errorMessage = body.error_message;
  if (body.completed_at !== undefined) updateData.completedAt = new Date(body.completed_at);

  // Handle image updates - support both old and new formats
  if (body.preview_images !== undefined) {
    updateData.previewImages = body.preview_images;
    if (Array.isArray(body.preview_images) && body.preview_images.length > 0) {
      await prisma.generatedImage.createMany({
        data: body.preview_images.map((url: string, index: number) => ({
          generationId: id,
          imageUrl: url,
          imageType: 'preview',
          imageIndex: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (body.high_res_images !== undefined) {
    updateData.highResImages = body.high_res_images;
    if (Array.isArray(body.high_res_images) && body.high_res_images.length > 0) {
      await prisma.generatedImage.createMany({
        data: body.high_res_images.map((url: string, index: number) => ({
          generationId: id,
          imageUrl: url,
          imageType: 'high_res',
          imageIndex: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Handle new format: generated_images array
  if (body.generated_images !== undefined && Array.isArray(body.generated_images)) {
    await prisma.generatedImage.deleteMany({ where: { generationId: id } });
    await prisma.generatedImage.createMany({
      data: body.generated_images.map((img: { image_url: string; image_type: string; image_index: number; metadata?: object }) => ({
        generationId: id,
        imageUrl: img.image_url,
        imageType: img.image_type,
        imageIndex: img.image_index,
        metadata: img.metadata || null,
      })),
    });
  }

  await prisma.generation.update({ where: { id }, data: updateData });

  return NextResponse.json({ success: true });
}

/**
 * GET /api/generations/[id]
 * Fetch single generation with project, template, and images
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
      generatedImages: { orderBy: { imageIndex: 'asc' } },
    },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(mapGenerationWithRelations(generation));
}

/**
 * DELETE /api/generations/[id]
 * Delete a generation (cascades to generated_images)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { id } = await context.params;

  const existing = await prisma.generation.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.generation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
