import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const [projects, generations] = await Promise.all([
      prisma.projects.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
      }),
      prisma.generations.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const stats = {
      totalProjects: projects.length,
      totalGenerations: generations.length,
      completedGenerations: generations.filter((g) => g.status === 'completed').length,
      sharedToGallery: generations.filter((g) => g.is_shared_to_gallery).length,
      generationsWithImages: generations.filter(
        (g) => Array.isArray(g.preview_images) && (g.preview_images as string[]).length > 0
      ).length,
    };

    return NextResponse.json({
      user_id,
      stats,
      projects,
      generations,
    });
  } catch (error) {
    logger.error({ error }, '数据检查失败');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '检查失败' },
      { status: 500 }
    );
  }
}
