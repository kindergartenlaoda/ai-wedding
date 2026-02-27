import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import { clearTemplateCache } from '@/lib/generation-shared';
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
    // 如果提供了 prompt_descriptions，必须同时提供 prompt_list
    if (data.prompt_descriptions && data.prompt_descriptions.length > 0) {
      if (!data.prompt_list || data.prompt_list.length === 0) {
        return false;
      }
      // 长度必须一致
      return data.prompt_descriptions.length === data.prompt_list.length;
    }
    return true;
  },
  {
    message: 'prompt_descriptions 必须与 prompt_list 同时提供且长度一致',
    path: ['prompt_descriptions'],
  }
);

/**
 * GET /api/admin/templates
 * Fetch all templates (including inactive ones) for admin management
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAdmin(_req);
  if (authResult instanceof Response) return authResult;

  const templates = await prisma.templates.findMany({
    orderBy: { sort_order: 'asc' },
  });

  const formatted = templates.map((t) => {
    // 计算 prompt_count
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
}

/**
 * POST /api/admin/templates
 * Create a new template
 */
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

  // Verify domain exists
  const domain = await prisma.domains.findUnique({
    where: { slug: body.domain },
    select: { id: true },
  });
  if (!domain) {
    return NextResponse.json(
      { error: `Domain "${body.domain}" does not exist` },
      { status: 400 }
    );
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

  // 清除缓存（新创建的模板不在缓存中，但为了一致性仍然调用）
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
}
