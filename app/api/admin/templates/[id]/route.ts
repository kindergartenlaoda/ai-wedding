import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import { clearTemplateCache } from '@/lib/generation-shared';
import {
  deleteLocalAdminTemplate,
  isLocalAdminStoreEnabled,
  listLocalDomains,
  updateLocalAdminTemplate,
} from '@/lib/local-admin-store';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  category: z.string().trim().min(1).optional(),
  domain: z.string().trim().min(1).optional(),
  preview_image_url: z.string().trim().min(1).optional(),
  prompt_config: z.object({}).passthrough().optional(),
  prompt_list: z.array(z.string()).optional(),
  prompt_descriptions: z.array(z.string()).optional(),
  price_credits: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
}).refine(
  (data) => {
    const promptList = data.prompt_list ?? [];
    if (data.prompt_descriptions && data.prompt_descriptions.length > 0) {
      return promptList.length > 0 && data.prompt_descriptions.length === promptList.length;
    }
    return true;
  },
  {
    message: 'prompt_descriptions must be provided with prompt_list and lengths must match',
    path: ['prompt_descriptions'],
  }
);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  const parsed = updateTemplateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (isLocalAdminStoreEnabled()) {
    if (body.domain !== undefined) {
      const domains = await listLocalDomains();
      if (!domains.some((domain) => domain.slug === body.domain)) {
        return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
      }
    }
    const template = await updateLocalAdminTemplate(id, body);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    clearTemplateCache(id);
    return NextResponse.json({ template, local: true });
  }

  try {
    if (body.domain !== undefined) {
      const domain = await prisma.domains.findUnique({
        where: { slug: body.domain },
        select: { id: true },
      });
      if (!domain) {
        return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.domain !== undefined) updateData.domain = body.domain;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.preview_image_url !== undefined) updateData.preview_image_url = body.preview_image_url;
    if (body.prompt_config !== undefined) updateData.prompt_config = body.prompt_config;
    if (body.prompt_list !== undefined) updateData.prompt_list = body.prompt_list;
    if (body.prompt_descriptions !== undefined) updateData.prompt_descriptions = body.prompt_descriptions;
    if (body.price_credits !== undefined) updateData.price_credits = body.price_credits;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const template = await prisma.templates.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.templates.update>[0]['data'],
    });

    clearTemplateCache(id);

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        domain: template.domain,
        category: template.category,
        preview_image_url: template.preview_image_url,
        prompt_config: template.prompt_config,
        prompt_list: template.prompt_list,
        prompt_descriptions: template.prompt_descriptions,
        price_credits: template.price_credits,
        is_active: template.is_active,
        sort_order: template.sort_order,
        created_at: template.created_at.toISOString(),
      },
    });
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    if (body.domain !== undefined) {
      const domains = await listLocalDomains();
      if (!domains.some((domain) => domain.slug === body.domain)) {
        return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
      }
    }
    const template = await updateLocalAdminTemplate(id, body);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    clearTemplateCache(id);
    return NextResponse.json({ template, local: true });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;

  if (isLocalAdminStoreEnabled()) {
    const deleted = await deleteLocalAdminTemplate(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    clearTemplateCache(id);
    return NextResponse.json({ success: true, local: true }, { status: 200 });
  }

  try {
    await prisma.templates.delete({ where: { id } });
    clearTemplateCache(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    if (!isLocalAdminStoreEnabled()) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    const deleted = await deleteLocalAdminTemplate(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    clearTemplateCache(id);
    return NextResponse.json({ success: true, local: true }, { status: 200 });
  }
}
