import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import type { CreateTemplatePayload } from '@/types/admin';

/**
 * GET /api/admin/templates
 * Fetch all templates (including inactive ones) for admin management
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAdmin(_req);
  if (authResult instanceof Response) return authResult;

  const templates = await prisma.template.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const formatted = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    domain: t.domain,
    preview_image_url: t.previewImageUrl,
    prompt_config: t.promptConfig,
    prompt_list: t.promptList,
    price_credits: t.priceCredits,
    is_active: t.isActive,
    sort_order: t.sortOrder,
    created_at: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ templates: formatted });
}

/**
 * POST /api/admin/templates
 * Create a new template
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = (await req.json()) as CreateTemplatePayload;

  if (!body.name || !body.category || !body.preview_image_url) {
    return NextResponse.json(
      { error: 'Missing required fields: name, category, preview_image_url' },
      { status: 400 }
    );
  }

  const template = await prisma.template.create({
    data: {
      name: body.name,
      description: body.description || '',
      category: body.category,
      previewImageUrl: body.preview_image_url,
      promptConfig: (body.prompt_config || {}) as object,
      promptList: (body.prompt_list ?? []) as unknown as Parameters<typeof prisma.template.create>[0]['data']['promptList'],
      priceCredits: body.price_credits || 10,
      isActive: body.is_active !== undefined ? body.is_active : true,
      sortOrder: body.sort_order || 0,
    },
  });

  return NextResponse.json({
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      preview_image_url: template.previewImageUrl,
      prompt_config: template.promptConfig,
      prompt_list: template.promptList,
      price_credits: template.priceCredits,
      is_active: template.isActive,
      sort_order: template.sortOrder,
      created_at: template.createdAt.toISOString(),
    },
  }, { status: 201 });
}
