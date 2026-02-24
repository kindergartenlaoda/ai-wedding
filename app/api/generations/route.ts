import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/generations
 * Create a new generation (deducts credits, creates generation record)
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
  } = body as {
    project_id?: string;
    template_id?: string;
    credits_used?: number;
    is_shared_to_gallery?: boolean;
    domain?: string;
  };

  if (!project_id || !template_id || typeof credits_used !== 'number') {
    return NextResponse.json(
      { error: 'Missing project_id, template_id, or credits_used' },
      { status: 400 }
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true },
  });
  if (!profile || profile.credits < credits_used) {
    return NextResponse.json({ error: '积分不足' }, { status: 402 });
  }

  const project = await prisma.project.findFirst({
    where: { id: project_id, userId },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const generation = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId },
      data: { credits: profile.credits - credits_used },
    });
    return tx.generation.create({
      data: {
        projectId: project_id,
        userId,
        templateId: template_id,
        status: 'processing',
        creditsUsed: credits_used,
        isSharedToGallery: is_shared_to_gallery ?? false,
        domain: domain || 'wedding',
      },
    });
  });

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    credits_used: generation.creditsUsed,
  }, { status: 201 });
}
