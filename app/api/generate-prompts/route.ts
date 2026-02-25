import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { getPromptStrategy } from '@/lib/prompt-strategies';
import type { ModelConfig } from '@/types/model-config';
import type { PromptItem } from '@/types/prompt';
import { isValidDomain } from '@/types/domain';
import { ModelConfigType } from '../../../generated/prisma/enums';
import { createRequestLogger, sanitize } from '@/lib/logger';

async function getActivePromptsConfig(log: ReturnType<typeof createRequestLogger>): Promise<ModelConfig | null> {
  try {
    const config = await prisma.modelConfig.findFirst({
      where: { type: ModelConfigType.generate_prompts, status: 'active' },
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
    log.error({ error: err }, '获取激活提示词生成配置异常');
    return null;
  }
}

/**
 * 使用 OpenAI 兼容 API 分析图片并生成提示词
 */
async function generatePromptsWithStrategy(
  imageBase64: string,
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  analysisPrompt: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<PromptItem[]> {
  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  // 确保 base64 格式正确
  const base64Data = imageBase64.includes('base64,')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const fullPrompt = `${analysisPrompt}

重要：中文和英文必须表达相同的内容，不要让英文比中文更详细或更简略。请返回完整的5个提示词。`;

  const requestData = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: fullPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Data,
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  };

  log.debug({
    endpoint,
    model,
    imageSize: base64Data.length,
  }, '调用 API');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestData),
  });

  log.debug({ status: response.status }, 'API 响应状态');

  if (!response.ok) {
    const errorText = await response.text();
    log.error({ error: sanitize.truncate(errorText, 500) }, 'API 错误响应');
    throw new Error(`提示词生成 API 请求失败: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const finishReason = result.choices?.[0]?.finish_reason;

  log.debug({
    hasChoices: !!result.choices,
    choicesLength: result.choices?.length,
    hasMessage: !!result.choices?.[0]?.message,
    hasContent: !!result.choices?.[0]?.message?.content,
    contentType: typeof result.choices?.[0]?.message?.content,
    contentLength: result.choices?.[0]?.message?.content?.length,
    finishReason: finishReason
  }, 'API 完整响应结构');

  // 检查是否因为长度限制而被截断
  if (finishReason === 'length') {
    log.error({ finishReason }, '响应被截断');
    throw new Error('生成的内容过长被截断，请重试');
  }

  const content = result.choices?.[0]?.message?.content || '';
  log.debug({
    preview: sanitize.truncate(content, 300),
    totalLength: content.length,
  }, '提取的内容');

  // 解析 JSON 响应
  try {
    const parsed = JSON.parse(content);
    log.debug({
      hasPrompts: !!parsed.prompts,
      promptsIsArray: Array.isArray(parsed.prompts),
      promptsLength: parsed.prompts?.length
    }, '解析成功');

    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
      log.error({ content: sanitize.truncate(content, 500) }, '格式错误');
      throw new Error('返回格式不正确：缺少 prompts 数组');
    }

    if (parsed.prompts.length === 0) {
      log.error('提示词数组为空');
      throw new Error('生成的提示词数量为 0');
    }

    // 验证每个提示词的结构
    for (const prompt of parsed.prompts) {
      if (!prompt.chinese || !prompt.english || typeof prompt.index !== 'number') {
        log.error({ prompt }, '提示词结构不完整');
        throw new Error('提示词结构不完整，缺少必要字段');
      }
    }

    log.info({ count: parsed.prompts.length }, '成功返回提示词');
    return parsed.prompts as PromptItem[];
  } catch (err) {
    log.error({
      error: err,
      contentLength: content.length,
      content: sanitize.truncate(content, 500),
    }, 'JSON 解析失败');

    // 如果是 JSON 解析错误，提供更友好的错误信息
    if (err instanceof SyntaxError) {
      throw new Error(`JSON 格式错误：${err.message}。可能是内容被截断，请重试`);
    }

    throw new Error('无法解析生成的提示词，请重试');
  }
}

/**
 * POST /api/generate-prompts
 * 根据图片生成风格提示词
 */
export async function POST(req: NextRequest) {
  const requestId = `prompts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-prompts', requestId);

  log.info('开始处理提示词生成请求');

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    log.info({ userId: authResult.user.id }, '用户认证成功');

    // 2) 获取提示词生成模型配置
    const dbConfig = await getActivePromptsConfig(log);

    if (!dbConfig) {
      log.error('未找到激活的提示词生成配置');
      return NextResponse.json(
        { success: false, error: '暂无可用的提示词生成配置，请联系管理员' },
        { status: 500 }
      );
    }

    log.info({ name: dbConfig.name, id: dbConfig.id }, '使用数据库配置');

    // 3) 解析请求体
    const body = await req.json();
    const { imageBase64, domain } = body as { imageBase64: string; domain?: string };

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '缺少图片参数' },
        { status: 400 }
      );
    }

    const resolvedDomain = domain && isValidDomain(domain) ? domain : 'wedding';
    const strategy = getPromptStrategy(resolvedDomain);
    const analysisPrompt = strategy.generateAnalysisPrompt();

    log.info({ domain: resolvedDomain }, '使用领域策略');
    log.debug('开始生成提示词');

    // 4) 生成提示词
    const prompts = await generatePromptsWithStrategy(
      imageBase64,
      dbConfig.api_base_url,
      dbConfig.api_key,
      dbConfig.model_name,
      analysisPrompt,
      log
    );

    log.info({ count: prompts.length }, '成功生成提示词');

    return NextResponse.json({
      success: true,
      prompts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: err }, '发生异常');
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

