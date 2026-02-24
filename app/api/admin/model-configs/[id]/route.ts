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
  '302': 'source_302',
};

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) return '***';
  return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 3)}`;
}

/**
 * GET /api/admin/model-configs/[id]
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await context.params;

  const config = await prisma.modelConfig.findUnique({ where: { id } });
  if (!config) {
    return NextResponse.json({ error: '配置不存在' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: config.id,
      type: config.type,
      name: config.name,
      api_base_url: config.apiBaseUrl,
      api_key: config.apiKey,
      model_name: config.modelName,
      status: config.status,
      source: config.source,
      description: config.description,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
      created_by: config.createdBy,
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

  const updateData: Parameters<typeof prisma.modelConfig.update>[0]['data'] = {};
  if (body.type !== undefined) updateData.type = TYPE_MAP[body.type] ?? ModelConfigType.other;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.api_base_url !== undefined) updateData.apiBaseUrl = body.api_base_url;
  if (body.api_key !== undefined) updateData.apiKey = body.api_key;
  if (body.model_name !== undefined) updateData.modelName = body.model_name;
  if (body.status !== undefined) updateData.status = body.status === 'active' ? ModelConfigStatus.active : ModelConfigStatus.inactive;
  if (body.source !== undefined) updateData.source = SOURCE_MAP[body.source] ?? ModelConfigSource.openAi;
  if (body.description !== undefined) updateData.description = body.description;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '没有提供要更新的字段' }, { status: 400 });
  }

  try {
    const config = await prisma.modelConfig.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({
      data: {
        id: config.id,
        type: config.type,
        name: config.name,
        api_base_url: config.apiBaseUrl,
        api_key_masked: maskApiKey(config.apiKey),
        model_name: config.modelName,
        status: config.status,
        source: config.source,
        description: config.description,
        created_at: config.createdAt.toISOString(),
        updated_at: config.updatedAt.toISOString(),
        created_by: config.createdBy,
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
    await prisma.modelConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 });
    }
    throw e;
  }
}
