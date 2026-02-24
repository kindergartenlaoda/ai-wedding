import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import type { UpdateTemplatePayload } from '@/types/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/templates/[id]
 * Update an existing template
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  const body = (await req.json()) as UpdateTemplatePayload;

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.preview_image_url !== undefined) updateData.previewImageUrl = body.preview_image_url;
  if (body.prompt_config !== undefined) updateData.promptConfig = body.prompt_config;
  if (body.prompt_list !== undefined) updateData.promptList = body.prompt_list;
  if (body.price_credits !== undefined) updateData.priceCredits = body.price_credits;
  if (body.is_active !== undefined) updateData.isActive = body.is_active;
  if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const template = await prisma.template.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.template.update>[0]['data'],
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
    });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    throw e;
  }
}

/**
 * DELETE /api/admin/templates/[id]
 * Delete a template
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(_req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;

  try {
    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    throw e;
  }
}
