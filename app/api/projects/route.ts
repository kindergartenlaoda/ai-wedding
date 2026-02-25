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
  const user_id = authResult.user.id;

  const body = await req.json();
  const { name, uploaded_photos } = body as { name?: string; uploaded_photos?: string[] };

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const project = await prisma.projects.create({
    data: {
      user_id,
      name,
      status: 'draft',
      uploaded_photos: (uploaded_photos || []) as string[],
    },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    status: project.status,
    uploaded_photos: project.uploaded_photos,
    created_at: project.created_at.toISOString(),
  }, { status: 201 });
}

/**
 * GET /api/projects?page=0&pageSize=20
 * Fetch user projects with latest generation and template
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const skip = page * pageSize;

  const [projects, total] = await Promise.all([
    prisma.projects.findMany({
      where: { user_id },
      include: {
        generations: {
          include: {
            templates: { select: { id: true, name: true, preview_image_url: true } },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.projects.count({ where: { user_id } }),
  ]);

  const formatted: ProjectWithTemplate[] = projects.map((p) => {
    const latestGen = p.generations[0];
    const template = latestGen?.templates;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      uploaded_photos: Array.isArray(p.uploaded_photos) ? (p.uploaded_photos as string[]) : [],
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
      template: template
        ? {
            id: template.id,
            name: template.name,
            preview_image_url: template.preview_image_url || '',
          }
        : undefined,
      generation: latestGen
        ? {
            id: latestGen.id,
            status: latestGen.status,
            preview_images: Array.isArray(latestGen.preview_images) ? (latestGen.preview_images as string[]) : [],
            high_res_images: Array.isArray(latestGen.high_res_images) ? (latestGen.high_res_images as string[]) : [],
            is_shared_to_gallery: latestGen.is_shared_to_gallery,
            completed_at: latestGen.completed_at?.toISOString() || '',
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
