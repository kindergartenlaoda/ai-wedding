import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { GalleryItem } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const domain = searchParams.get('domain');
    const offset = (page - 1) * limit;

    const where: { isSharedToGallery: boolean; domain?: string } = { isSharedToGallery: true };
    if (domain) where.domain = domain;

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        include: {
          project: { select: { name: true } },
          template: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.generation.count({ where }),
    ]);

    const galleryItems: GalleryItem[] = generations.map((gen) => ({
      id: gen.id,
      preview_images: Array.isArray(gen.previewImages) ? (gen.previewImages as string[]) : [],
      project_name: gen.project?.name || '未命名项目',
      template_name: gen.template?.name || '未知模板',
      user_name: gen.user?.name || '匿名用户',
      created_at: gen.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: galleryItems,
      pagination: {
        page,
        limit,
        total,
        hasMore: total > offset + limit,
      },
    });
  } catch (error) {
    console.error('画廊 API 错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
