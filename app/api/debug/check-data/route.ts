import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    const [projects, generations] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.generation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const stats = {
      totalProjects: projects.length,
      totalGenerations: generations.length,
      completedGenerations: generations.filter((g) => g.status === 'completed').length,
      sharedToGallery: generations.filter((g) => g.isSharedToGallery).length,
      generationsWithImages: generations.filter(
        (g) => Array.isArray(g.previewImages) && (g.previewImages as string[]).length > 0
      ).length,
    };

    return NextResponse.json({
      userId,
      stats,
      projects,
      generations,
    });
  } catch (error) {
    console.error('数据检查失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '检查失败' },
      { status: 500 }
    );
  }
}
