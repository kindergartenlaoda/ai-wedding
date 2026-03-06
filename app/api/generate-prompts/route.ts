import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { getPromptStrategy } from '@/lib/prompt-strategies';
import { GeneratePromptsSchema, validateData } from '@/lib/validations';
import { checkRateLimit, rateLimitResponse, RL_LIMIT } from '@/lib/generation-shared';
import {
  deductCreditsForGeneration,
  refundCreditsForGeneration,
  getUserCreditBalance,
} from '@/lib/credit-service';
import type { ModelConfig } from '@/types/model-config';
import type { PromptItem } from '@/types/prompt';
import type { Prisma } from '../../../generated/prisma/client';
import { ModelConfigType } from '../../../generated/prisma/enums';
import { createRequestLogger, sanitize } from '@/lib/logger';

const CREDITS_PER_PROMPT_GENERATION = 5;

async function getActivePromptsConfig(log: ReturnType<typeof createRequestLogger>): Promise<ModelConfig | null> {
  try {
    // 优先使用 generate_prompts 配置
    let config = await prisma.model_configs.findFirst({
      where: { type: ModelConfigType.generate_prompts, status: 'active' },
    });
    
    // 如果没有 generate_prompts 配置，降级使用 identify_image 配置
    if (!config) {
      log.info('未找到 generate_prompts 配置，降级使用 identify_image 配置');
      config = await prisma.model_configs.findFirst({
        where: { type: ModelConfigType.identify_image, status: 'active' },
      });
    }
    
    if (!config) {
      log.warn('未找到任何可用配置');
      return null;
    }
    
    log.info({ type: config.type, name: config.name }, '使用配置');
    
    return {
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
  } catch (err) {
    log.error({ error: err }, '获取激活提示词生成配置异常');
    return null;
  }
}

async function generatePromptsWithStrategy(
  imageBase64: string,
  api_base_url: string,
  api_key: string,
  model: string,
  analysisPrompt: string,
  log: ReturnType<typeof createRequestLogger>
): Promise<PromptItem[]> {
  const endpoint = `${api_base_url.replace(/\/$/, '')}/v1/chat/completions`;

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
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify(requestData),
    signal: AbortSignal.timeout(30000),
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

  if (finishReason === 'length') {
    log.error({ finishReason }, '响应被截断');
    throw new Error('生成的内容过长被截断，请重试');
  }

  const content = result.choices?.[0]?.message?.content || '';
  log.debug({
    preview: sanitize.truncate(content, 300),
    totalLength: content.length,
  }, '提取的内容');

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

    if (err instanceof SyntaxError) {
      throw new Error(`JSON 格式错误：${err.message}。可能是内容被截断，请重试`);
    }

    throw new Error('无法解析生成的提示词，请重试');
  }
}

export async function POST(req: NextRequest) {
  const requestId = `prompts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-prompts', requestId);

  log.info('开始处理提示词生成请求');

  let userId: string | null = null;

  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    userId = authResult.user.id;
    log.info({ user_id: userId }, '用户认证成功');

    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      log.warn({ userId, count: rl.count, limit: RL_LIMIT }, '速率限制超过');
      return rateLimitResponse(rl.retryAfter!);
    }
    log.debug({ count: rl.count, limit: RL_LIMIT }, '速率限制检查通过');

    const balance = await getUserCreditBalance(userId);
    log.info({ credits: balance }, '用户积分余额');

    if (balance < CREDITS_PER_PROMPT_GENERATION) {
      log.warn({ current: balance, required: CREDITS_PER_PROMPT_GENERATION }, '积分不足');
      return NextResponse.json({
        error: '积分不足',
        current_credits: balance,
        required_credits: CREDITS_PER_PROMPT_GENERATION,
        message: `当前积分 ${balance}，需要 ${CREDITS_PER_PROMPT_GENERATION} 积分才能生成`
      }, { status: 402 });
    }

    const tempId = `prompt_${requestId}`;
    try {
      await deductCreditsForGeneration(
        userId,
        tempId,
        CREDITS_PER_PROMPT_GENERATION,
        '提示词生成消费积分'
      );
    } catch (deductError) {
      log.error({ error: deductError }, '扣除积分失败');
      return NextResponse.json({ error: '扣除积分失败，请重试' }, { status: 500 });
    }

    log.info({ deducted: CREDITS_PER_PROMPT_GENERATION, remaining: balance - CREDITS_PER_PROMPT_GENERATION }, '成功扣除积分');

    const body = await req.json();
    const validation = validateData(GeneratePromptsSchema, body);
    if (!validation.success) {
      log.error({ error: validation.error }, '参数验证失败');
      await refundCreditsForGeneration(userId, tempId, CREDITS_PER_PROMPT_GENERATION, '验证失败退款');
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { imageBase64, domain } = validation.data;

    const dbConfig = await getActivePromptsConfig(log);

    if (!dbConfig) {
      log.error('未找到激活的提示词生成配置');
      await refundCreditsForGeneration(userId, tempId, CREDITS_PER_PROMPT_GENERATION, '配置不可用退款');
      return NextResponse.json(
        { error: '暂无可用的提示词生成配置，请联系管理员' },
        { status: 500 }
      );
    }

    log.info({ name: dbConfig.name, id: dbConfig.id }, '使用数据库配置');

    const strategy = getPromptStrategy(domain);
    const analysisPrompt = strategy.generateAnalysisPrompt();

    log.info({ domain }, '使用领域策略');
    log.debug('开始生成提示词');

    const prompts = await generatePromptsWithStrategy(
      imageBase64,
      dbConfig.api_base_url,
      dbConfig.api_key,
      dbConfig.model_name,
      analysisPrompt,
      log
    );

    log.info({ count: prompts.length }, '成功生成提示词');

    const record = await prisma.prompt_generations.create({
      data: {
        user_id: userId,
        domain,
        prompts: prompts as unknown as Prisma.InputJsonValue,
        model_config_id: dbConfig.id,
        credits_used: CREDITS_PER_PROMPT_GENERATION,
      },
    });

    log.info({ recordId: record.id }, '保存历史记录成功');

    return NextResponse.json({
      success: true,
      prompts,
      recordId: record.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: err }, '发生异常');

    if (userId) {
      await refundCreditsForGeneration(
        userId,
        `prompt_${requestId}`,
        CREDITS_PER_PROMPT_GENERATION,
        '生成失败退款'
      );
      log.info('已退还积分');
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
