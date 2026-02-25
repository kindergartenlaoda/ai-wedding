import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { GalleryItem } from '@/types/database';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const domain = searchParams.get('domain');
    const offset = (page - 1) * limit;

    const where: { is_shared_to_gallery: boolean; domain?: string } = { is_shared_to_gallery: true };
    if (domain) where.domain = domain;

    const [generations, total] = await Promise.all([
      prisma.generations.findMany({
        where,
        include: {
          projects: { select: { name: true } },
          templates: { select: { name: true } },
          users: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.generations.count({ where }),
    ]);

    const galleryItems: GalleryItem[] = generations.map((gen) => ({
      id: gen.id,
      generation_id: gen.id,
      preview_images: Array.isArray(gen.preview_images) ? (gen.preview_images as string[]) : [],
      project_name: gen.projects?.name || '未命名项目',
      template_name: gen.templates?.name || '未知模板',
      user_name: gen.users?.name || '匿名用户',
      created_at: gen.created_at.toISOString(),
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
    logger.error({ error }, '画廊 API 错误');
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
