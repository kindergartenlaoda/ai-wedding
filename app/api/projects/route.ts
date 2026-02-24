import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ProjectWithTemplate } from '@/types/database';

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { name, uploaded_photos } = body as { name?: string; uploaded_photos?: string[] };

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      userId,
      name,
      status: 'draft',
      uploadedPhotos: (uploaded_photos || []) as string[],
    },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status,
    uploaded_photos: project.uploadedPhotos,
    created_at: project.createdAt.toISOString(),
  }, { status: 201 });
}

/**
 * GET /api/projects?page=0&pageSize=20
 * Fetch user projects with latest generation and template
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const skip = page * pageSize;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: {
        generations: {
          include: {
            template: { select: { id: true, name: true, previewImageUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where: { userId } }),
  ]);

  const formatted: ProjectWithTemplate[] = projects.map((p) => {
    const latestGen = p.generations[0];
    const template = latestGen?.template;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      uploaded_photos: Array.isArray(p.uploadedPhotos) ? (p.uploadedPhotos as string[]) : [],
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      template: template
        ? {
            id: template.id,
            name: template.name,
            preview_image_url: template.previewImageUrl || '',
          }
        : undefined,
      generation: latestGen
        ? {
            id: latestGen.id,
            status: latestGen.status,
            preview_images: Array.isArray(latestGen.previewImages) ? (latestGen.previewImages as string[]) : [],
            high_res_images: Array.isArray(latestGen.highResImages) ? (latestGen.highResImages as string[]) : [],
            is_shared_to_gallery: latestGen.isSharedToGallery,
            completed_at: latestGen.completedAt?.toISOString() || '',
          }
        : undefined,
    };
  });

  return NextResponse.json({
    data: formatted,
    total,
    hasMore: skip + pageSize < total,
  });
}
