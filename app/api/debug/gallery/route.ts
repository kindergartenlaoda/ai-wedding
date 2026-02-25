import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {};

  const [allCount, sharedCount, completedCount, combinedCount, galleryData, noInnerData] =
    await Promise.all([
      prisma.generations.count(),
      prisma.generations.count({ where: { is_shared_to_gallery: true } }),
      prisma.generations.count({ where: { status: 'completed' } }),
      prisma.generations.count({
        where: { is_shared_to_gallery: true, status: 'completed' },
      }),
      prisma.generations.findMany({
        where: {
          is_shared_to_gallery: true,
          status: 'completed',
        },
        include: {
          projects: { select: { name: true } },
          templates: { select: { name: true } },
          users: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.generations.findMany({
        where: { is_shared_to_gallery: true, status: 'completed' },
        take: 5,
      }),
    ]);

  results.test1_all = { count: allCount, sample: null };
  results.test2_shared = { count: sharedCount, sample: null };
  results.test3_completed = { count: completedCount };
  results.test4_combined = { count: combinedCount, sample: null };
  results.test5_full_query = {
    count: galleryData.length,
    sample: galleryData[0] ?? null,
  };
  results.test6_no_inner = {
    count: noInnerData.length,
    sample: noInnerData[0] ?? null,
  };

  return NextResponse.json(results, { status: 200 });
}
