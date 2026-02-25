import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import type { UpdateModelConfigInput } from '@/types/model-config';
import { ModelConfigType, ModelConfigStatus, ModelConfigSource } from '../../../../../generated/prisma/enums';

const TYPE_MAP: Record<string, (typeof ModelConfigType)[keyof typeof ModelConfigType]> = {
  'generate-image': ModelConfigType.generate_image,
  'identify-image': ModelConfigType.identify_image,
  'generate-prompts': ModelConfigType.generate_prompts,
  other: ModelConfigType.other,
};

const SOURCE_MAP: Record<string, (typeof ModelConfigSource)[keyof typeof ModelConfigSource]> = {
  openRouter: 'openRouter',
  openAi: 'openAi',
};

function maskApiKey(api_key: string): string {
  if (!api_key || api_key.length < 10) return '***';
  return `${api_key.substring(0, 6)}...${api_key.substring(api_key.length - 3)}`;
}

/**
 * GET /api/admin/model-configs/[id]
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;

  const config = await prisma.model_configs.findUnique({ where: { id } });
  if (!config) {
    return NextResponse.json({ error: '配置不存在' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: config.id,
      type: config.type,
      name: config.name,
      api_base_url: config.api_base_url,
      api_key: config.api_key,
      model_name: config.model_name,
      status: config.status,
      source: config.source,
      description: config.description,
      created_at: config.created_at.toISOString(),
      updated_at: config.updated_at.toISOString(),
      created_by: config.created_by,
    },
  });
}

/**
 * PATCH /api/admin/model-configs/[id]
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;
  const body = (await req.json()) as UpdateModelConfigInput;

  const updateData: Parameters<typeof prisma.model_configs.update>[0]['data'] = {};
  if (body.type !== undefined) updateData.type = TYPE_MAP[body.type] ?? ModelConfigType.other;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.api_base_url !== undefined) updateData.api_base_url = body.api_base_url;
  if (body.api_key !== undefined) updateData.api_key = body.api_key;
  if (body.model_name !== undefined) updateData.model_name = body.model_name;
  if (body.status !== undefined) updateData.status = body.status === 'active' ? ModelConfigStatus.active : ModelConfigStatus.inactive;
  if (body.source !== undefined) updateData.source = SOURCE_MAP[body.source] ?? ModelConfigSource.openAi;
  if (body.description !== undefined) updateData.description = body.description;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '没有提供要更新的字段' }, { status: 400 });
  }

  try {
    const config = await prisma.model_configs.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({
      data: {
        id: config.id,
        type: config.type,
        name: config.name,
        api_base_url: config.api_base_url,
        api_key_masked: maskApiKey(config.api_key),
        model_name: config.model_name,
        status: config.status,
        source: config.source,
        description: config.description,
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
        created_by: config.created_by,
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }
    throw e;
  }
}

/**
 * DELETE /api/admin/model-configs/[id]
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;

  try {
    await prisma.model_configs.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }
    throw e;
  }
}
