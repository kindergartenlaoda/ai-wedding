import { GenerateImageV2Schema, validateData } from '@/lib/validations';
import { requireAuth } from '@/lib/auth-api';
import { createRequestLogger, sanitize } from '@/lib/logger';
import {
  checkRateLimit,
  rateLimitResponse,
  RL_LIMIT,
  getActiveModelConfig,
  convertUrlToBase64,
  resolvePromptFromTemplate,
  enhancePromptWithSettings,
  mapCreativityToParams,
  filterSensitiveData,
} from '@/lib/generation-shared';
import {
  deductCreditsForGeneration,
  refundCreditsForGeneration,
  getUserCreditBalance,
} from '@/lib/credit-service';
import type { ChatContentItem, FacePreservationLevel, CreativityLevel } from '@/lib/generation-shared';

export const runtime = 'nodejs';

const ENV_IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL;
const ENV_IMAGE_API_KEY = process.env.IMAGE_API_KEY;
const ENV_IMAGE_CHAT_MODEL = process.env.IMAGE_CHAT_MODEL || 'gemini-2.5-flash-image';

const CREDITS_PER_GENERATION = 15;

export async function POST(req: Request) {
  const requestId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-single', requestId);

  log.info('开始处理单图生成请求（带积分抵扣）');

  let userId: string | null = null;
  let originalCredits: number | null = null;

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    userId = authResult.user.id;
    log.info({ userId }, '用户认证成功');

    // 2) 速率限制
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      log.warn({ userId, count: rl.count, limit: RL_LIMIT }, '速率限制超过');
      return rateLimitResponse(rl.retryAfter!);
    }
    log.debug({ count: rl.count, limit: RL_LIMIT }, '速率限制检查通过');

    // 3) 检查并扣除积分（通过 credit-service 确保事务原子性）
    const currentBalance = await getUserCreditBalance(userId);
    log.info({ credits: currentBalance }, '用户积分余额');

    if (currentBalance < CREDITS_PER_GENERATION) {
      log.warn({ current: currentBalance, required: CREDITS_PER_GENERATION }, '积分不足');
      return new Response(
        JSON.stringify({
          error: '积分不足',
          current_credits: currentBalance,
          required_credits: CREDITS_PER_GENERATION,
          message: `当前积分 ${currentBalance}，需要 ${CREDITS_PER_GENERATION} 积分才能生成`
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 先扣积分（生成 ID 在后续步骤创建，这里用临时占位）
    // 注意：generate-single 不创建 generations 记录，积分扣除用 generationId='pending'
    // 实际 generationId 在生成完成后由前端调用 /api/generations 创建
    try {
      await deductCreditsForGeneration(
        userId,
        'pending-' + requestId,
        CREDITS_PER_GENERATION,
        '单图生成消费积分'
      );
    } catch (deductError) {
      log.error({ error: deductError }, '扣除积分失败');
      return jsonError('扣除积分失败，请重试', 500);
    }

    // 记录原始余额用于退款
    originalCredits = currentBalance;
    log.info({ deducted: CREDITS_PER_GENERATION, remaining: currentBalance - CREDITS_PER_GENERATION }, '成功扣除积分');

    // 4) 参数验证（V2：支持 template_id 模式和 custom_prompt 模式）
    const body = await req.json();
    const validation = validateData(GenerateImageV2Schema, body);
    if (!validation.success) {
      log.error({ error: validation.error }, '参数验证失败');
      await refundCredits(userId, originalCredits, log);
      return jsonError(validation.error, 400);
    }

    const data = validation.data;
    const image_inputs = data.image_inputs;
    const source = data.source;
    const facePreservation = (data.face_preservation || 'high') as FacePreservationLevel;
    const creativityLevel = (data.creativity_level || 'conservative') as CreativityLevel;

    // 5) 解析提示词（服务端完成，不依赖前端传入 prompt）
    let rawPrompt: string;
    if ('template_id' in data) {
      try {
        rawPrompt = await resolvePromptFromTemplate(data.template_id, data.prompt_index);
        log.info({ templateId: data.template_id, promptIndex: data.prompt_index }, '从模板解析提示词');
      } catch (resolveErr) {
        log.error({ error: resolveErr }, '模板提示词解析失败');
        await refundCredits(userId, originalCredits, log);
        return jsonError(resolveErr instanceof Error ? resolveErr.message : '模板提示词解析失败', 400);
      }
    } else {
      rawPrompt = data.custom_prompt;
      log.info({ promptLength: rawPrompt.length }, '使用自定义提示词');
    }

    const composedPrompt = enhancePromptWithSettings(rawPrompt, facePreservation);
    const { temperature, topP: top_p } = mapCreativityToParams(creativityLevel);

    // 6) 获取模型配置
    const dbConfig = await getActiveModelConfig(log, undefined, source);

    let apiBaseUrl: string;
    let apiKey: string;
    let chatModel: string;

    if (dbConfig) {
      log.info({ name: dbConfig.name, id: dbConfig.id, source: dbConfig.source }, '使用数据库配置');
      apiBaseUrl = dbConfig.api_base_url;
      apiKey = dbConfig.api_key;
      chatModel = dbConfig.model_name;
    } else {
      log.warn({ source: source || 'default' }, '未找到激活配置，使用环境变量回退');
      apiBaseUrl = ENV_IMAGE_API_BASE_URL || '';
      apiKey = ENV_IMAGE_API_KEY || '';
      chatModel = ENV_IMAGE_CHAT_MODEL;
    }

    log.info({
      promptLength: composedPrompt.length,
      finalModel: chatModel,
      source: source || 'default',
      imageCount: image_inputs?.length || 0,
      facePreservation,
      creativityLevel,
      temperature,
      topP: top_p,
    }, '参数验证通过');

    if (!apiKey) {
      log.error('IMAGE_API_KEY 未配置');
      await refundCredits(userId, originalCredits, log);
      return jsonError('Server misconfigured: IMAGE_API_KEY is missing', 500);
    }

    // 7) 根据 source 决定请求格式
    const is302AI = source === '302' || apiBaseUrl.includes('302.ai');

    if (is302AI) {
      return handle302AI(req, log, {
        apiBaseUrl, apiKey, chatModel, composedPrompt,
        image_inputs, userId, originalCredits,
      });
    } else {
      return handleOpenAICompat(req, log, {
        apiBaseUrl, apiKey, chatModel, composedPrompt,
        image_inputs, temperature, top_p, userId, originalCredits,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: message, stack: err instanceof Error ? err.stack : undefined }, '发生异常');

    // 尝试退还积分
    if (userId && originalCredits !== null) {
      await refundCredits(userId, originalCredits, log);
    }

    return jsonError(message, 500);
  }
}

// ─── 302.ai Gemini 原生格式 ────────────────────────────────

interface Handle302Params {
  apiBaseUrl: string;
  apiKey: string;
  chatModel: string;
  composedPrompt: string;
  image_inputs?: string[];
  userId: string;
  originalCredits: number;
}

async function handle302AI(
  _req: Request,
  log: ReturnType<typeof createRequestLogger>,
  params: Handle302Params,
) {
  const { apiBaseUrl, apiKey, chatModel, composedPrompt, image_inputs, userId, originalCredits } = params;

  log.info('使用 302.ai Gemini 原生格式');

  type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
  const parts: GeminiPart[] = [{ text: composedPrompt }];

  // 添加图片（最多 3 张）
  if (Array.isArray(image_inputs)) {
    const picked = image_inputs
      .filter((s) => typeof s === 'string' && (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://')))
      .slice(0, 3);

    for (const url of picked) {
      try {
        const dataUrl = url.startsWith('data:') ? url : await convertUrlToBase64(url);
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          parts.push({ inline_data: { mime_type: matches[1], data: matches[2] } });
          log.debug({ mimeType: matches[1], dataLength: matches[2].length }, '添加图片');
        }
      } catch (error) {
        log.warn({ error: error instanceof Error ? error.message : 'Unknown' }, '跳过图片');
      }
    }
  }

  const requestData = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/google/v1/models/${chatModel}`;
  log.info({ endpoint }, '调用 302.ai API');
  log.debug({ requestData: filterSensitiveData(requestData) }, '请求参数');

  const fetchStartTime = Date.now();
  const upstreamResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestData),
  });
  const fetchDuration = Date.now() - fetchStartTime;

  log.info({ status: upstreamResponse.status, duration: `${fetchDuration}ms` }, '收到 302.ai 响应');

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    log.error({ status: upstreamResponse.status, error: sanitize.truncate(errorText, 500) }, '302.ai API 返回错误');
    await refundCredits(userId, originalCredits, log);
    return jsonError(`API请求失败: ${upstreamResponse.status} ${errorText}`, upstreamResponse.status);
  }

  const responseData = await upstreamResponse.json();
  log.info({ responseData: filterSensitiveData(responseData) }, '302.ai 响应解析成功');

  // 转换为 SSE 流式格式
  return new Response(build302Stream(responseData, log), {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

function build302Stream(
  responseData: Record<string, unknown>,
  log: ReturnType<typeof createRequestLogger>,
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      try {
        const candidates = responseData.candidates as Array<{
          content?: { parts?: Array<{ text?: string; url?: string; inlineData?: { mimeType?: string; data: string } }> }
        }>;

        if (candidates?.[0]?.content?.parts) {
          for (const part of candidates[0].content.parts) {
            if (part.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: part.text } }] })}\n\n`));
            }
            if (part.url) {
              log.info({ url: part.url }, '提取到图片 URL');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `![image](${part.url})` } }] })}\n\n`));
            }
            if (part.inlineData?.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              const imageDataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              log.info({ mimeType, base64Length: part.inlineData.data.length }, '提取到 base64 图片');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `![image](${imageDataUrl})` } }] })}\n\n`));
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        log.info('流式转换完成');
      } catch (error) {
        log.error({ error }, '流式转换失败');
        controller.error(error);
      }
    },
  });
}

// ─── OpenAI 兼容格式 ───────────────────────────────────────

interface HandleOpenAIParams {
  apiBaseUrl: string;
  apiKey: string;
  chatModel: string;
  composedPrompt: string;
  image_inputs?: string[];
  temperature?: number;
  top_p?: number;
  userId: string;
  originalCredits: number;
}

async function handleOpenAICompat(
  _req: Request,
  log: ReturnType<typeof createRequestLogger>,
  params: HandleOpenAIParams,
) {
  const { apiBaseUrl, apiKey, chatModel, composedPrompt, image_inputs, temperature, top_p, userId, originalCredits } = params;

  log.info('使用 OpenAI 兼容格式');

  const chatContent: ChatContentItem[] = [{ type: 'text', text: composedPrompt }];

  if (Array.isArray(image_inputs)) {
    const picked = image_inputs
      .filter((s) => typeof s === 'string' && (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://')))
      .slice(0, 3);

    for (const url of picked) {
      try {
        const base64Url = await convertUrlToBase64(url);
        chatContent.push({ type: 'image_url', image_url: { url: base64Url } });
      } catch (error) {
        log.warn({ error: error instanceof Error ? error.message : 'Unknown' }, '跳过图片');
      }
    }
    log.debug({ count: picked.length }, '图片输入');
  }

  const requestData = {
    model: chatModel,
    temperature: temperature ?? 0.2,
    top_p: top_p ?? 0.7,
    messages: [{ role: 'user', content: chatContent }],
    stream: true,
    stream_options: { include_usage: true },
  };

  const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  log.info({ endpoint, model: chatModel, contentCount: chatContent.length }, '调用上游 API');

  const fetchStartTime = Date.now();
  const upstreamResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestData),
  });
  const fetchDuration = Date.now() - fetchStartTime;

  log.info({ status: upstreamResponse.status, duration: `${fetchDuration}ms` }, '收到上游响应');

  if (!upstreamResponse.ok) {
    const errorData = await upstreamResponse.text();
    log.error({ status: upstreamResponse.status, error: sanitize.errorMessage(errorData) }, '上游 API 返回错误');
    await refundCredits(userId, originalCredits, log);
    return jsonError(`图片生成失败，请稍后重试`, upstreamResponse.status);
  }

  log.info('开始转发流式响应');

  return new Response(upstreamResponse.body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}

// ─── 辅助函数 ───────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

async function refundCredits(
  userId: string,
  _originalCredits: number,
  log: ReturnType<typeof createRequestLogger>,
) {
  try {
    await refundCreditsForGeneration(
      userId,
      'pending-refund',
      CREDITS_PER_GENERATION,
      '单图生成失败退款'
    );
    log.info({ credits: CREDITS_PER_GENERATION }, '已退还积分');
  } catch (refundErr) {
    log.error({ error: refundErr }, '退还积分失败');
  }
}
