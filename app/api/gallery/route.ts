import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { validatePaginationParams } from '@/lib/validation-utils';
import { isLocalGenerationStoreAvailable, listLocalSharedGenerations } from '@/lib/local-generation-store';
import { countLocalGenerationComments, countLocalGenerationLikes } from '@/lib/local-feature-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // 使用统一的参数验证工具
    const { page, limit, offset } = validatePaginationParams(
      searchParams.get('page'),
      searchParams.get('limit'),
      100 // 最大 100 条/页
    );

    const domain = searchParams.get('domain');
    const sort = searchParams.get('sort') || 'latest';

    const where: { is_shared_to_gallery: boolean; domain?: string } = { is_shared_to_gallery: true };
    if (domain) where.domain = domain;

    type OrderByType = { created_at: 'desc' } | { image_likes: { _count: 'desc' } };
    const orderBy: OrderByType = sort === 'popular'
      ? { image_likes: { _count: 'desc' as const } }
      : { created_at: 'desc' as const };

    const [generations, total] = await Promise.all([
      prisma.generations.findMany({
        where,
        include: {
          projects: { select: { name: true } },
          templates: { select: { name: true } },
          users: { select: { name: true } },
          _count: { select: { image_likes: true, gallery_comments: true } },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.generations.count({ where }),
    ]);

    const galleryItems = generations.map((gen) => ({
      id: gen.id,
      generation_id: gen.id,
      preview_images: Array.isArray(gen.preview_images) ? (gen.preview_images as string[]) : [],
      project_name: gen.projects?.name || '未命名项目',
      template_name: gen.templates?.name || '未知模板',
      template_id: gen.template_id ?? undefined,
      domain: gen.domain,
      user_name: gen.users?.name || '匿名用户',
      likes_count: gen._count?.image_likes ?? 0,
      comments_count: gen._count?.gallery_comments ?? 0,
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
    if (isLocalGenerationStoreAvailable()) {
      const { searchParams } = request.nextUrl;
      const { page, limit, offset } = validatePaginationParams(
        searchParams.get('page'),
        searchParams.get('limit'),
        100
      );
      const domain = searchParams.get('domain');
      const sort = searchParams.get('sort') || 'latest';
      const { generations, total } = await listLocalSharedGenerations({ domain, limit, offset, sort });
      const items = await Promise.all(generations.map(async (generation) => ({
        id: generation.id,
        generation_id: generation.id,
        preview_images: generation.preview_images,
        project_name: 'Local Project',
        template_name: generation.template_id || 'Local Template',
        template_id: generation.template_id ?? undefined,
        domain: generation.domain,
        user_name: 'Local Admin',
        likes_count: await countLocalGenerationLikes(generation.id),
        comments_count: await countLocalGenerationComments(generation.id),
        created_at: generation.created_at,
      })));

      return NextResponse.json({
        items,
        pagination: {
          page,
          limit,
          total,
          hasMore: total > offset + limit,
        },
        local: true,
      });
    }
    logger.error({ error }, '画廊 API 错误');
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
