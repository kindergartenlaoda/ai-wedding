import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ModelConfig, ModelConfigType } from '@/types/model-config';
import { ModelConfigType as PrismaModelConfigType } from '../../../../generated/prisma/enums';

export const dynamic = 'force-dynamic';

const TYPE_MAP: Record<string, (typeof PrismaModelConfigType)[keyof typeof PrismaModelConfigType]> = {
  'generate-image': PrismaModelConfigType.generate_image,
  'identify-image': PrismaModelConfigType.identify_image,
  'generate-prompts': PrismaModelConfigType.generate_prompts,
  other: PrismaModelConfigType.other,
};

/**
 * GET /api/model-configs/active?type=generate-image
 * 获取指定类型的激活配置（需要认证）
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ModelConfigType;

    if (!type) {
      return NextResponse.json({ error: '缺少 type 参数' }, { status: 400 });
    }

    const prismaType = TYPE_MAP[type];
    if (!prismaType) {
      return NextResponse.json({ error: '无效的 type 参数' }, { status: 400 });
    }

    const config = await prisma.modelConfig.findFirst({
      where: { type: prismaType, status: 'active' },
    });

    if (!config) {
      return NextResponse.json({ data: null });
    }

    const data: ModelConfig = {
      id: config.id,
      type: config.type as ModelConfig['type'],
      name: config.name,
      api_base_url: config.apiBaseUrl,
      api_key: config.apiKey,
      model_name: config.modelName,
      status: config.status as ModelConfig['status'],
      source: config.source as ModelConfig['source'],
      description: config.description ?? undefined,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
      created_by: config.createdBy ?? undefined,
    };

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('获取激活配置异常:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
