import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ProjectWithTemplate } from '@/types/database';
import { getCache, invalidateCacheByPrefix, setCache } from '@/lib/server-cache';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PROJECTS_CACHE_TTL_MS = 15_000;

function parsePagination(searchParams: URLSearchParams) {
  const rawPage = Number.parseInt(searchParams.get('page') ?? '0', 10);
  const rawPageSize = Number.parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);

  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: page * pageSize };
}

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

  invalidateCacheByPrefix(`projects:${user_id}:`);

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
  const { page, pageSize, skip } = parsePagination(searchParams);
  const cacheKey = `projects:${user_id}:${page}:${pageSize}`;

  const cached = getCache<{
    data: ProjectWithTemplate[];
    total: number;
    hasMore: boolean;
  }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const [projects, total] = await Promise.all([
    prisma.projects.findMany({
      where: { user_id },
      select: {
        id: true,
        name: true,
        status: true,
        uploaded_photos: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.projects.count({ where: { user_id } }),
  ]);

  const projectIds = projects.map((p) => p.id);
  const latestGenerations = projectIds.length > 0
    ? await prisma.generations.findMany({
        where: { project_id: { in: projectIds } },
        orderBy: [{ project_id: 'asc' }, { created_at: 'desc' }],
        distinct: ['project_id'],
        select: {
          project_id: true,
          id: true,
          status: true,
          preview_images: true,
          high_res_images: true,
          is_shared_to_gallery: true,
          completed_at: true,
          templates: { select: { id: true, name: true, preview_image_url: true } },
        },
      })
    : [];

  const latestByProject = new Map<string, (typeof latestGenerations)[number]>();
  for (const gen of latestGenerations) {
    if (gen.project_id) latestByProject.set(gen.project_id, gen);
  }

  const formatted: ProjectWithTemplate[] = projects.map((p) => {
    const latestGen = latestByProject.get(p.id);
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

  const responseBody = {
    data: formatted,
    total,
    hasMore: skip + pageSize < total,
  };

  setCache(cacheKey, responseBody, PROJECTS_CACHE_TTL_MS);

  return NextResponse.json(responseBody);
}
