import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

/**
 * GET /api/stats/public
 * Public platform statistics for social proof (no auth required).
 * Cached for 5 minutes via revalidate.
 */
export async function GET() {
  try {
    const [usersCount, generationsCount, galleryCount] = await Promise.all([
      prisma.users.count(),
      prisma.generations.count({
        where: { status: 'completed' },
      }),
      prisma.generations.count({
        where: { is_shared_to_gallery: true },
      }),
    ]);

    return NextResponse.json({
      users: usersCount,
      generations: generationsCount,
      gallery: galleryCount,
    });
  } catch {
    return NextResponse.json(
      { users: 0, generations: 0, gallery: 0 },
      { status: 200 }
    );
  }
}
