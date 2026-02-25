import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ModelConfig } from '@/types/model-config';
import { ModelConfigType } from '../../../generated/prisma/enums';
import { createRequestLogger, sanitize } from '@/lib/logger';
import { logger } from '@/lib/logger';

const ENV_IDENTIFY_API_BASE_URL = process.env.IDENTIFY_API_BASE_URL || 'https://api.openai.com';
const ENV_IDENTIFY_API_KEY = process.env.IDENTIFY_API_KEY;
const ENV_IDENTIFY_MODEL = process.env.IDENTIFY_MODEL || 'gpt-4o-mini';

const DISABLE_SSL_VERIFY = process.env.DISABLE_SSL_VERIFY === 'true';
if (DISABLE_SSL_VERIFY) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  logger.warn('[SSL] SSL 证书验证已全局禁用（仅用于开发环境）');
}

async function getActiveIdentifyConfig(log: ReturnType<typeof createRequestLogger>): Promise<ModelConfig | null> {
  try {
    const config = await prisma.modelConfig.findFirst({
      where: { type: ModelConfigType.identify_image, status: 'active' },
    });
    if (!config) return null;
    return {
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
  } catch (err) {
    log.error({ error: err }, '获取激活识别配置异常');
    return null;
  }
}

/**
 * 使用 OpenAI 兼容 API 识别图片是否包含人
 */
async function identifyPerson(
  imageUrl: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<{ hasPerson: boolean; confidence: number; description: string }> {
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const requestData = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请判断这张图片中是否包含人物。只需回答 YES 或 NO，并简要说明理由（不超过20字）。格式：YES/NO - 理由',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 100,
    temperature: 0.1,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error({ status: response.status, error: sanitize.truncate(errorText, 500) }, '识别 API 请求失败');
    throw new Error(`识别 API 请求失败: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '';

  // 解析响应
  const hasPerson = content.toUpperCase().includes('YES');
  const confidence = hasPerson ? 0.9 : 0.1;

  return {
    hasPerson,
    confidence,
    description: content.trim(),
  };
}

/**
 * POST /api/identify-image
 * 识别图片中是否包含人物
 */
export async function POST(req: NextRequest) {
  const requestId = `identify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('identify-image', requestId);

  log.info('开始处理图片识别请求');

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    log.info({ userId: authResult.user.id }, '用户认证成功');

    // 2) 获取识别模型配置
    const dbConfig = await getActiveIdentifyConfig(log);

    let IDENTIFY_API_BASE_URL: string;
    let IDENTIFY_API_KEY: string;
    let IDENTIFY_MODEL: string;

    if (dbConfig) {
      log.info({ name: dbConfig.name, id: dbConfig.id }, '使用数据库配置');
      IDENTIFY_API_BASE_URL = dbConfig.api_base_url;
      IDENTIFY_API_KEY = dbConfig.api_key;
      IDENTIFY_MODEL = dbConfig.model_name;
    } else {
      log.warn('未找到激活的数据库配置，使用环境变量回退');
      IDENTIFY_API_BASE_URL = ENV_IDENTIFY_API_BASE_URL;
      IDENTIFY_API_KEY = ENV_IDENTIFY_API_KEY || '';
      IDENTIFY_MODEL = ENV_IDENTIFY_MODEL;
    }

    if (!IDENTIFY_API_KEY) {
      log.error('IDENTIFY_API_KEY 未配置');
      return NextResponse.json(
        { error: 'Server misconfigured: IDENTIFY_API_KEY is missing' },
        { status: 500 }
      );
    }

    // 3) 解析请求体
    const body = await req.json();
    const { images } = body as { images: string[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '缺少图片参数' }, { status: 400 });
    }

    log.info({ count: images.length }, '开始识别图片');

    // 4) 识别每张图片
    const results = await Promise.all(
      images.map(async (imageUrl, index) => {
        try {
          log.debug({ index: index + 1, total: images.length }, '识别图片');
          const result = await identifyPerson(
            imageUrl,
            IDENTIFY_API_BASE_URL,
            IDENTIFY_API_KEY,
            IDENTIFY_MODEL,
            log
          );
          log.debug({ index: index + 1, result }, '图片识别结果');
          return {
            index,
            success: true,
            ...result,
          };
        } catch (err) {
          log.error({ index: index + 1, error: err }, '图片识别失败');
          return {
            index,
            success: false,
            hasPerson: false,
            confidence: 0,
            description: err instanceof Error ? err.message : '识别失败',
          };
        }
      })
    );

    // 5) 统计结果
    const validImages = results.filter((r) => r.success && r.hasPerson);
    const invalidImages = results.filter((r) => !r.success || !r.hasPerson);

    log.info({ validCount: validImages.length, total: images.length }, '识别完成');

    return NextResponse.json({
      success: true,
      total: images.length,
      validCount: validImages.length,
      invalidCount: invalidImages.length,
      results,
      allValid: invalidImages.length === 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: err }, '发生异常');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

