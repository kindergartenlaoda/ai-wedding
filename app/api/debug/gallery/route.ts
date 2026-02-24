import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const results: Record<string, unknown> = {};

  const [allCount, sharedCount, completedCount, combinedCount, galleryData, noInnerData] =
    await Promise.all([
      prisma.generation.count(),
      prisma.generation.count({ where: { isSharedToGallery: true } }),
      prisma.generation.count({ where: { status: 'completed' } }),
      prisma.generation.count({
        where: { isSharedToGallery: true, status: 'completed' },
      }),
      prisma.generation.findMany({
        where: {
          isSharedToGallery: true,
          status: 'completed',
        },
        include: {
          project: { select: { name: true } },
          template: { select: { name: true } },
          user: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.generation.findMany({
        where: { isSharedToGallery: true, status: 'completed' },
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
