import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/engagement-stats
 * Aggregate likes and downloads for the current user
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const [likesCount, downloadsCount] = await Promise.all([
    prisma.imageLike.count({ where: { userId } }),
    prisma.imageDownload.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    likes: likesCount,
    downloads: downloadsCount,
  });
}
