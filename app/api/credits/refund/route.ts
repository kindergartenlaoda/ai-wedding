import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/refund
 * Refund credits and optionally mark generation as failed
 * Body: { credits, generation_id?, error_message? }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { credits, generation_id, error_message } = body as {
    credits?: number;
    generation_id?: string;
    error_message?: string;
  };

  if (typeof credits !== 'number' || credits <= 0) {
    return NextResponse.json({ error: 'Invalid credits' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  await prisma.profile.update({
    where: { userId },
    data: { credits: profile.credits + credits },
  });

  if (generation_id) {
    const gen = await prisma.generation.findFirst({
      where: { id: generation_id, userId },
    });
    if (gen) {
      await prisma.generation.update({
        where: { id: generation_id },
        data: {
          status: 'failed',
          errorMessage: error_message || '生成失败',
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
