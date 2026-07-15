import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { mapGenerationWithRelations } from '@/lib/generation-mapper';
import { invalidateCacheByPrefix } from '@/lib/server-cache';
import {
  deleteLocalGeneration,
  formatLocalGeneration,
  getLocalGeneration,
  isLocalGenerationStoreEnabled,
  updateLocalGeneration,
} from '@/lib/local-generation-store';

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
  const user_id = authResult.user.id;

  const { id } = await context.params;
  const body = await req.json();

  if (isLocalGenerationStoreEnabled(user_id)) {
    const generation = await updateLocalGeneration(id, user_id, body);
    if (!generation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  let existing: { id: string } | null = null;
  try {
    existing = await prisma.generations.findFirst({
      where: { id, user_id },
      select: { id: true },
    });
  } catch (error) {
    if (!isLocalGenerationStoreEnabled(user_id)) throw error;
    const generation = await updateLocalGeneration(id, user_id, body);
    if (!generation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updateData: Parameters<typeof prisma.generations.update>[0]['data'] = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.error_message !== undefined) updateData.error_message = body.error_message;
  if (body.completed_at !== undefined) updateData.completed_at = new Date(body.completed_at);

  // Handle image updates - support both old and new formats
  if (body.preview_images !== undefined) {
    updateData.preview_images = body.preview_images;
  }

  if (body.high_res_images !== undefined) {
    updateData.high_res_images = body.high_res_images;
  }

  await prisma.$transaction(async (tx) => {
    if (body.preview_images !== undefined) {
      await tx.generated_images.deleteMany({
        where: { generation_id: id, image_type: 'preview' },
      });
      if (Array.isArray(body.preview_images) && body.preview_images.length > 0) {
        await tx.generated_images.createMany({
          data: body.preview_images.map((url: string, index: number) => ({
            generation_id: id,
            image_url: url,
            image_type: 'preview',
            image_index: index,
          })),
          skipDuplicates: true,
        });
      }
    }

    if (body.high_res_images !== undefined) {
      await tx.generated_images.deleteMany({
        where: { generation_id: id, image_type: 'high_res' },
      });
      if (Array.isArray(body.high_res_images) && body.high_res_images.length > 0) {
        await tx.generated_images.createMany({
          data: body.high_res_images.map((url: string, index: number) => ({
            generation_id: id,
            image_url: url,
            image_type: 'high_res',
            image_index: index,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Handle new format: generated_images array
    if (body.generated_images !== undefined && Array.isArray(body.generated_images)) {
      await tx.generated_images.deleteMany({ where: { generation_id: id } });
      if (body.generated_images.length > 0) {
        await tx.generated_images.createMany({
          data: body.generated_images.map((img: { image_url: string; image_type: string; image_index: number; metadata?: object }) => ({
            generation_id: id,
            image_url: img.image_url,
            image_type: img.image_type,
            image_index: img.image_index,
            metadata: img.metadata || null,
          })),
        });
      }
    }

    await tx.generations.update({ where: { id }, data: updateData });
  });

  invalidateCacheByPrefix(`generations:${user_id}:`);
  invalidateCacheByPrefix(`projects:${user_id}:`);

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
  const user_id = authResult.user.id;

  const { id } = await context.params;

  if (isLocalGenerationStoreEnabled(user_id)) {
    const localGeneration = await getLocalGeneration(id, user_id);
    if (!localGeneration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ...formatLocalGeneration(localGeneration), local: true });
  }

  let generation;
  try {
    generation = await prisma.generations.findFirst({
      where: { id, user_id },
      include: {
        projects: { select: { name: true, uploaded_photos: true } },
        templates: { select: { name: true } },
        generated_images: { orderBy: { image_index: 'asc' } },
      },
    });
  } catch (error) {
    if (!isLocalGenerationStoreEnabled(user_id)) throw error;
    const localGeneration = await getLocalGeneration(id, user_id);
    if (!localGeneration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ...formatLocalGeneration(localGeneration), local: true });
  }

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
  const user_id = authResult.user.id;

  const { id } = await context.params;

  if (isLocalGenerationStoreEnabled(user_id)) {
    const deleted = await deleteLocalGeneration(id, user_id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  let existing;
  try {
    existing = await prisma.generations.findFirst({
      where: { id, user_id },
    });
  } catch (error) {
    if (!isLocalGenerationStoreEnabled(user_id)) throw error;
    const deleted = await deleteLocalGeneration(id, user_id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.generations.delete({ where: { id } });

  invalidateCacheByPrefix(`generations:${user_id}:`);
  invalidateCacheByPrefix(`projects:${user_id}:`);

  return NextResponse.json({ success: true });
}
