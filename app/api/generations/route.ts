import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { deductCreditsForGeneration } from '@/lib/credit-service';
import { mapGeneration } from '@/lib/generation-mapper';
import { getCache, invalidateCacheByPrefix, setCache } from '@/lib/server-cache';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const GENERATIONS_CACHE_TTL_MS = 10_000;

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
 * POST /api/generations
 * Create a new generation (unified for both batch and single)
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const {
    project_id,
    template_id,
    credits_used,
    is_shared_to_gallery,
    domain,
    generation_type = 'batch',
    prompt,
    original_image,
    settings,
  } = body as {
    project_id?: string;
    template_id?: string;
    credits_used?: number;
    is_shared_to_gallery?: boolean;
    domain?: string;
    generation_type?: 'batch' | 'single';
    prompt?: string;
    original_image?: string;
    settings?: object;
  };

  // Validation based on generation type
  if (generation_type === 'batch') {
    if (!project_id || !template_id || typeof credits_used !== 'number') {
      return NextResponse.json(
        { error: 'Missing project_id, template_id, or credits_used for batch generation' },
        { status: 400 }
      );
    }
  } else if (generation_type === 'single') {
    if (!prompt || !original_image || typeof credits_used !== 'number') {
      return NextResponse.json(
        { error: 'Missing prompt, original_image, or credits_used for single generation' },
        { status: 400 }
      );
    }
  }

  const [profile, project, template] = await Promise.all([
    prisma.profiles.findUnique({
      where: { user_id },
      select: { credits: true },
    }),
    generation_type === 'batch' && project_id
      ? prisma.projects.findFirst({ where: { id: project_id, user_id }, select: { id: true, uploaded_photos: true } })
      : Promise.resolve(null),
    template_id
      ? prisma.templates.findUnique({
          where: { id: template_id },
          select: { id: true, domain: true },
        })
      : Promise.resolve(null),
  ]);

  if (!profile || profile.credits < (credits_used || 0)) {
    return NextResponse.json({ error: '积分不足' }, { status: 402 });
  }

  if (generation_type === 'batch' && project_id) {
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  // 后端强制校验：如果 domain 要求人脸识别，验证照片是否已通过识别
  if (generation_type === 'batch' && template && project) {
    const domainSlug = template.domain || domain || 'wedding';
    const domainConfig = await prisma.domains.findUnique({
      where: { slug: domainSlug },
      select: { require_face_detection: true },
    });

    if (domainConfig?.require_face_detection) {
      // 检查 project 的 uploaded_photos 是否为空
      const uploadedPhotos = project.uploaded_photos as string[] | null;
      if (!uploadedPhotos || uploadedPhotos.length === 0) {
        return NextResponse.json(
          { error: '该领域要求上传照片并通过人脸识别验证' },
          { status: 400 }
        );
      }

      // 注意：这里假设前端已经过滤了无效照片，只上传了通过识别的照片
      // 如果需要更严格的验证，可以在这里调用识别接口再次验证
    }
  }

  const generation = await prisma.generations.create({
    data: {
      project_id: generation_type === 'batch' ? project_id : null,
      user_id,
      template_id: template_id || null,
      status: 'processing',
      credits_used: credits_used || 0,
      is_shared_to_gallery: is_shared_to_gallery ?? false,
      domain: domain || 'wedding',
      generation_type: generation_type,
      prompt: generation_type === 'single' ? prompt : null,
      original_image: generation_type === 'single' ? original_image : null,
      settings: generation_type === 'single' ? ((settings || {}) as object) : undefined,
    },
  });

  await deductCreditsForGeneration(
    user_id,
    generation.id,
    credits_used || 0,
    `${generation_type === 'batch' ? '批量' : '单图'}生成消费积分`
  );

  invalidateCacheByPrefix(`generations:${user_id}:`);
  invalidateCacheByPrefix(`projects:${user_id}:`);

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    generation_type: generation.generation_type,
    credits_used: generation.credits_used,
  }, { status: 201 });
}

/**
 * GET /api/generations?type=batch|single&page=0&pageSize=20
 * List generations (unified endpoint)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'batch' | 'single' | null;
  const { page, pageSize, skip } = parsePagination(searchParams);
  const typeKey = type || 'all';
  const cacheKey = `generations:${user_id}:${typeKey}:${page}:${pageSize}`;

  const cached = getCache<{ data: unknown[]; total: number; hasMore: boolean }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const where: { user_id: string; generation_type?: 'batch' | 'single' } = { user_id };
  if (type) where.generation_type = type;

  const [generations, total] = await Promise.all([
    prisma.generations.findMany({
      where,
      include: {
        generated_images: { orderBy: { image_index: 'asc' } },
        projects: { select: { name: true, uploaded_photos: true } },
        templates: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.generations.count({ where }),
  ]);

  const responseBody = {
    data: generations.map(mapGeneration),
    total,
    hasMore: skip + pageSize < total,
  };

  setCache(cacheKey, responseBody, GENERATIONS_CACHE_TTL_MS);
  return NextResponse.json(responseBody);
}
