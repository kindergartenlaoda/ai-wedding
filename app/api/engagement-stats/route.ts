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
  const user_id = authResult.user.id;

  const [likesCount, downloadsCount] = await Promise.all([
    prisma.image_likes.count({ where: { user_id } }),
    prisma.image_downloads.count({ where: { user_id } }),
  ]);

  return NextResponse.json({
    likes: likesCount,
    downloads: downloadsCount,
  });
}
