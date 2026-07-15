import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ModelConfigSource } from '@/types/model-config';
import { ModelConfigType } from '../../../../generated/prisma/enums';
import { logger } from '@/lib/logger';
import { getActiveLocalModelConfig, isLocalModelConfigStoreEnabled } from '@/lib/local-model-config-store';

export const dynamic = 'force-dynamic';

export interface AvailableSourcesResponse {
  sources: ModelConfigSource[];
}

/**
 * GET /api/model-sources/available
 * 获取所有已配置且激活的模型来源
 */
export async function GET() {
  try {
    if (isLocalModelConfigStoreEnabled()) {
      const localConfig = await getActiveLocalModelConfig('generate-image');
      const source = localConfig?.source
        || (process.env.IMAGE_API_KEY && process.env.IMAGE_API_BASE_URL ? 'openAi' : null);
      return NextResponse.json({ sources: source ? [source] : [] });
    }

    const configs = await prisma.model_configs.findMany({
      where: { type: ModelConfigType.generate_image, status: 'active' },
      select: { source: true },
    });

    const uniqueSources = Array.from(
      new Set(configs.map((c) => c.source as ModelConfigSource))
    );

    if (uniqueSources.length === 0 && process.env.IMAGE_API_KEY && process.env.IMAGE_API_BASE_URL) {
      uniqueSources.push('openAi');
    }

    return NextResponse.json({ sources: uniqueSources });
  } catch (error) {
    logger.error({ error }, '获取可用模型来源出错');
    if (process.env.IMAGE_API_KEY && process.env.IMAGE_API_BASE_URL) {
      return NextResponse.json({ sources: ['openAi'] satisfies ModelConfigSource[] });
    }
    return NextResponse.json({ sources: [] });
  }
}
