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

    const formatted = data.map((t) => {
      const promptList = Array.isArray(t.prompt_list)
        ? (t.prompt_list as string[]).filter(s => s && s.trim())  // 过滤空字符串
        : [];
      const promptDescs = Array.isArray(t.prompt_descriptions) ? (t.prompt_descriptions as string[]) : [];
      const configObj = (t.prompt_config && typeof t.prompt_config === 'object') ? t.prompt_config as Record<string, unknown> : {};
      const hasBasePrompt = typeof configObj.basePrompt === 'string' && configObj.basePrompt.trim().length > 0;
      const promptCount = promptList.length > 0 ? promptList.length : (hasBasePrompt ? 1 : 0);

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        domain: t.domain,
        preview_image_url: t.preview_image_url,
        prompt_count: promptCount,
        prompt_descriptions: promptDescs,
        price_credits: t.price_credits,
        is_active: t.is_active,
        is_available: promptCount > 0, // 新增：标记模板是否可用
        sort_order: t.sort_order,
        created_at: t.created_at.toISOString(),
      };
    });

    // 过滤掉 prompt_count 为 0 的模板
    const availableTemplates = formatted.filter(t => t.prompt_count > 0);

    return NextResponse.json(
      { data: availableTemplates },
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

