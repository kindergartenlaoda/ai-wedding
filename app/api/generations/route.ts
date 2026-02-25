import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { deductCreditsForGeneration } from '@/lib/credit-service';
import { mapGeneration } from '@/lib/generation-mapper';

/**
 * POST /api/generations
 * Create a new generation (unified for both batch and single)
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

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

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true },
  });
  if (!profile || profile.credits < (credits_used || 0)) {
    return NextResponse.json({ error: '积分不足' }, { status: 402 });
  }

  if (generation_type === 'batch' && project_id) {
    const project = await prisma.project.findFirst({
      where: { id: project_id, userId },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  const generation = await prisma.generation.create({
    data: {
      projectId: generation_type === 'batch' ? project_id : null,
      userId,
      templateId: template_id || null,
      status: 'processing',
      creditsUsed: credits_used || 0,
      isSharedToGallery: is_shared_to_gallery ?? false,
      domain: domain || 'wedding',
      generationType: generation_type,
      prompt: generation_type === 'single' ? prompt : null,
      originalImage: generation_type === 'single' ? original_image : null,
      settings: generation_type === 'single' ? ((settings || {}) as object) : undefined,
    },
  });

  await deductCreditsForGeneration(
    userId,
    generation.id,
    credits_used || 0,
    `${generation_type === 'batch' ? '批量' : '单图'}生成消费积分`
  );

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    generation_type: generation.generationType,
    credits_used: generation.creditsUsed,
  }, { status: 201 });
}

/**
 * GET /api/generations?type=batch|single&page=0&pageSize=20
 * List generations (unified endpoint)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'batch' | 'single' | null;
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const skip = page * pageSize;

  const where: { userId: string; generationType?: 'batch' | 'single' } = { userId };
  if (type) where.generationType = type;

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      include: {
        generatedImages: { orderBy: { imageIndex: 'asc' } },
        project: { select: { name: true, uploadedPhotos: true } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.generation.count({ where }),
  ]);

  return NextResponse.json({
    data: generations.map(mapGeneration),
    total,
    hasMore: skip + pageSize < total,
  });
}
