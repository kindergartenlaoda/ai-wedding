import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const domain = searchParams.get('domain');

    const where: { is_active: boolean; domain?: string } = { is_active: true };
    if (domain) where.domain = domain;

    const data = await prisma.templates.findMany({
      where,
      orderBy: { sort_order: 'asc' },
    });

    // Map to snake_case for API compatibility
    const formatted = data.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      domain: t.domain,
      preview_image_url: t.preview_image_url,
      prompt_config: t.prompt_config,
      prompt_list: t.prompt_list,
      price_credits: t.price_credits,
      is_active: t.is_active,
      sort_order: t.sort_order,
      created_at: t.created_at.toISOString(),
    }));

    return NextResponse.json(
      { data: formatted },
      {
        headers: {
          // 公共缓存1小时，客户端缓存5分钟
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          // 允许CDN缓存
          'CDN-Cache-Control': 'public, s-maxage=3600',
          // Vercel Edge缓存
          'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

