import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { getActiveLocalModelConfig, isLocalModelConfigStoreEnabled } from '@/lib/local-model-config-store';
import type { ModelConfig, ModelConfigType } from '@/types/model-config';
import { ModelConfigType as PrismaModelConfigType } from '../../../../generated/prisma/enums';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TYPE_MAP: Record<string, (typeof PrismaModelConfigType)[keyof typeof PrismaModelConfigType]> = {
  'generate-image': PrismaModelConfigType.generate_image,
  'identify-image': PrismaModelConfigType.identify_image,
  'generate-prompts': PrismaModelConfigType.generate_prompts,
  other: PrismaModelConfigType.other,
};

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ModelConfigType;

    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    const prismaType = TYPE_MAP[type];
    if (!prismaType) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    if (isLocalModelConfigStoreEnabled()) {
      const localConfig = await getActiveLocalModelConfig(type);
      return NextResponse.json({ data: localConfig, local: true });
    }

    try {
      const config = await prisma.model_configs.findFirst({
        where: { type: prismaType, status: 'active' },
      });

      if (!config) {
        if (isLocalModelConfigStoreEnabled()) {
          const localConfig = await getActiveLocalModelConfig(type);
          return NextResponse.json({ data: localConfig, local: true });
        }
        return NextResponse.json({ data: null });
      }

      const data: ModelConfig = {
        id: config.id,
        type: config.type as ModelConfig['type'],
        name: config.name,
        api_base_url: config.api_base_url,
        api_key: config.api_key,
        model_name: config.model_name,
        status: config.status as ModelConfig['status'],
        source: config.source as ModelConfig['source'],
        description: config.description ?? undefined,
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
        created_by: config.created_by ?? undefined,
      };

      return NextResponse.json({ data });
    } catch (error) {
      if (!isLocalModelConfigStoreEnabled()) throw error;
      const config = await getActiveLocalModelConfig(type);
      return NextResponse.json({ data: config, local: true });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    logger.error({ error: err }, 'Failed to get active model config');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
