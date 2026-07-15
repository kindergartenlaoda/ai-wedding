import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { countLocalUserEngagement, isLocalFeatureStoreEnabled } from '@/lib/local-feature-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engagement-stats
 * Aggregate likes and downloads for the current user
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  if (isLocalFeatureStoreEnabled(user_id)) {
    const stats = await countLocalUserEngagement(user_id);
    return NextResponse.json({ ...stats, local: true });
  }

  try {
    const [likesCount, downloadsCount] = await Promise.all([
      prisma.image_likes.count({ where: { user_id } }),
      prisma.image_downloads.count({ where: { user_id } }),
    ]);

    return NextResponse.json({
      likes: likesCount,
      downloads: downloadsCount,
    });
  } catch (error) {
    if (process.env.LOCAL_ADMIN_MODE === 'true' && user_id === 'local-admin') {
      return NextResponse.json({ likes: 0, downloads: 0, local: true });
    }
    throw error;
  }
}
