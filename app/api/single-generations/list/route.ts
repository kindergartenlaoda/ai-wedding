import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { SingleGeneration } from '@/types/database';

/**
 * GET /api/single-generations/list?page=0&pageSize=20
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const skip = page * pageSize;

  const [generations, total] = await Promise.all([
    prisma.singleGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.singleGeneration.count({ where: { userId } }),
  ]);

  const formatted: SingleGeneration[] = generations.map((g) => ({
    id: g.id,
    user_id: g.userId,
    prompt: g.prompt,
    original_image: g.originalImage,
    result_image: g.resultImage,
    settings: g.settings as SingleGeneration['settings'],
    credits_used: g.creditsUsed,
    created_at: g.createdAt.toISOString(),
  }));

  return NextResponse.json({
    data: formatted,
    total,
    hasMore: skip + pageSize < total,
  });
}
