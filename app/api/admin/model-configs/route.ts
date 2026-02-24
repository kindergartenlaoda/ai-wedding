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
  '302': 'source_302',
};

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) return '***';
  return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 3)}`;
}

/**
 * GET /api/admin/model-configs
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const configs = await prisma.modelConfig.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const maskedData = configs.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    api_base_url: c.apiBaseUrl,
    api_key_masked: maskApiKey(c.apiKey),
    model_name: c.modelName,
    status: c.status,
    source: c.source,
    description: c.description,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    created_by: c.createdBy,
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

  const config = await prisma.modelConfig.create({
    data: {
      type: prismaType,
      name: body.name,
      apiBaseUrl: body.api_base_url,
      apiKey: body.api_key,
      modelName: body.model_name,
      status: (body.status === 'active' ? ModelConfigStatus.active : ModelConfigStatus.inactive) as 'active' | 'inactive',
      source: prismaSource,
      description: body.description || null,
      createdBy: authResult.profile.userId,
    },
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
  }, { status: 201 });
}
