import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import { clearTemplateCache } from '@/lib/generation-shared';
import {
  createLocalAdminTemplate,
  isLocalAdminStoreEnabled,
  listLocalAdminTemplates,
  listLocalDomains,
} from '@/lib/local-admin-store';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  category: z.string().trim().min(1),
  domain: z.string().trim().min(1),
  preview_image_url: z.string().trim().min(1),
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

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  if (isLocalAdminStoreEnabled()) {
    const templates = await listLocalAdminTemplates();
    return NextResponse.json({ templates, local: true });
  }

  try {
    const templates = await prisma.templates.findMany({
      orderBy: { sort_order: 'asc' },
    });

    const formatted = templates.map((t) => {
      const promptList = Array.isArray(t.prompt_list) ? (t.prompt_list as string[]).filter(Boolean) : [];
      const promptCount = promptList.length > 0
        ? promptList.length
        : (t.prompt_config && typeof t.prompt_config === 'object' && (t.prompt_config as { basePrompt?: string }).basePrompt?.trim() ? 1 : 0);

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        domain: t.domain,
        preview_image_url: t.preview_image_url,
        prompt_config: t.prompt_config,
        prompt_list: t.prompt_list,
        prompt_descriptions: t.prompt_descriptions,
        prompt_count: promptCount,
        price_credits: t.price_credits,
        is_active: t.is_active,
        sort_order: t.sort_order,
        created_at: t.created_at.toISOString(),
      };
    });

    return NextResponse.json({ templates: formatted });
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    const templates = await listLocalAdminTemplates();
    return NextResponse.json({ templates, local: true });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const parsed = createTemplateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;

  if (isLocalAdminStoreEnabled()) {
    const domains = await listLocalDomains();
    if (!domains.some((domain) => domain.slug === body.domain)) {
      return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
    }
    const template = await createLocalAdminTemplate(body);
    clearTemplateCache(template.id);
    return NextResponse.json({ template, local: true }, { status: 201 });
  }

  try {
    const domain = await prisma.domains.findUnique({
      where: { slug: body.domain },
      select: { id: true },
    });
    if (!domain) {
      return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
    }

    const template = await prisma.templates.create({
      data: {
        domain: body.domain,
        name: body.name,
        description: body.description || '',
        category: body.category,
        preview_image_url: body.preview_image_url,
        prompt_config: (body.prompt_config || {}) as object,
        prompt_list: (body.prompt_list ?? []) as unknown as Parameters<typeof prisma.templates.create>[0]['data']['prompt_list'],
        prompt_descriptions: (body.prompt_descriptions ?? []) as unknown as Parameters<typeof prisma.templates.create>[0]['data']['prompt_descriptions'],
        price_credits: body.price_credits || 10,
        is_active: body.is_active !== undefined ? body.is_active : true,
        sort_order: body.sort_order || 0,
      },
    });

    clearTemplateCache(template.id);

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
    }, { status: 201 });
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    const domains = await listLocalDomains();
    if (!domains.some((domain) => domain.slug === body.domain)) {
      return NextResponse.json({ error: `Domain "${body.domain}" does not exist` }, { status: 400 });
    }
    const template = await createLocalAdminTemplate(body);
    clearTemplateCache(template.id);
    return NextResponse.json({ template, local: true }, { status: 201 });
  }
}
