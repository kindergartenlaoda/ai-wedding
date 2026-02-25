import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ModelConfigSource } from '@/types/model-config';
import { ModelConfigType } from '../../../../generated/prisma/enums';
import { logger } from '@/lib/logger';

export interface AvailableSourcesResponse {
  sources: ModelConfigSource[];
}

/**
 * GET /api/model-sources/available
 * 获取所有已配置且激活的模型来源
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  try {
    const configs = await prisma.modelConfig.findMany({
      where: { type: ModelConfigType.generate_image, status: 'active' },
      select: { source: true },
    });

    const uniqueSources = Array.from(
      new Set(configs.map((c) => c.source as ModelConfigSource))
    );

    return NextResponse.json({ sources: uniqueSources });
  } catch (error) {
    logger.error({ error }, '获取可用模型来源出错');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
