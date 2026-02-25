import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import type { CreateModelConfigInput } from '@/types/model-config';
import { ModelConfigType, ModelConfigStatus, ModelConfigSource } from '../../../../generated/prisma/enums';

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
 * GET /api/admin/model-configs
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const configs = await prisma.model_configs.findMany({
    orderBy: { created_at: 'desc' },
  });

  const maskedData = configs.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    api_base_url: c.api_base_url,
    api_key_masked: maskApiKey(c.api_key),
    model_name: c.model_name,
    status: c.status,
    source: c.source,
    description: c.description,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
    created_by: c.created_by,
  }));

  return NextResponse.json({ data: maskedData, total: maskedData.length });
}

/**
 * POST /api/admin/model-configs
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = (await req.json()) as CreateModelConfigInput;

  if (!body.name || !body.type || !body.api_base_url || !body.api_key || !body.model_name) {
    return NextResponse.json(
      { error: '缺少必填字段: name, type, api_base_url, api_key, model_name' },
      { status: 400 }
    );
  }

  const prismaType = TYPE_MAP[body.type] ?? ModelConfigType.other;
  const prismaSource = (body.source && SOURCE_MAP[body.source]) || SOURCE_MAP['openAi'];

  const config = await prisma.model_configs.create({
    data: {
      type: prismaType,
      name: body.name,
      api_base_url: body.api_base_url,
      api_key: body.api_key,
      model_name: body.model_name,
      status: (body.status === 'active' ? ModelConfigStatus.active : ModelConfigStatus.inactive) as 'active' | 'inactive',
      source: prismaSource,
      description: body.description || null,
      created_by: authResult.profile.user_id,
    },
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
  }, { status: 201 });
}
