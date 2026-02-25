import { GenerateImageSchema, validateData } from '@/lib/validations';
import { requireAuth } from '@/lib/auth-api';
import { createRequestLogger, sanitize } from '@/lib/logger';
import {
  checkRateLimit,
  rateLimitResponse,
  RL_LIMIT,
  getActiveModelConfig,
  convertUrlToBase64,
  composePrompt,
} from '@/lib/generation-shared';
import type { ChatContentItem } from '@/lib/generation-shared';

export const runtime = 'nodejs';

// 从环境变量读取配置（作为回退）
const ENV_IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL;
const ENV_IMAGE_API_KEY = process.env.IMAGE_API_KEY;
const ENV_IMAGE_CHAT_MODEL = process.env.IMAGE_CHAT_MODEL || 'gemini-2.5-flash-image';

export async function POST(req: Request) {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-stream', requestId);

  log.info('开始处理流式图片生成请求');

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;
    log.info({ userId }, '用户认证成功');

    // 2) 获取模型配置（优先从数据库，回退到环境变量）
    const dbConfig = await getActiveModelConfig(log);

    let IMAGE_API_BASE_URL: string;
    let IMAGE_API_KEY: string;
    let IMAGE_CHAT_MODEL: string;

    if (dbConfig) {
      log.info({ configName: dbConfig.name, configId: dbConfig.id }, '使用数据库配置');
      IMAGE_API_BASE_URL = dbConfig.api_base_url;
      IMAGE_API_KEY = dbConfig.api_key;
      IMAGE_CHAT_MODEL = dbConfig.model_name;
    } else {
      log.warn('未找到激活的数据库配置，使用环境变量回退');
      IMAGE_API_BASE_URL = ENV_IMAGE_API_BASE_URL || '';
      IMAGE_API_KEY = ENV_IMAGE_API_KEY || '';
      IMAGE_CHAT_MODEL = ENV_IMAGE_CHAT_MODEL;
    }

    log.debug({
      source: dbConfig ? 'database' : 'environment',
      baseUrl: IMAGE_API_BASE_URL,
      apiKey: sanitize.apiKey(IMAGE_API_KEY),
      model: IMAGE_CHAT_MODEL,
    }, '配置检查');

    if (!IMAGE_API_KEY) {
      log.error('IMAGE_API_KEY 未配置');
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: IMAGE_API_KEY is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3) 速率限制
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      log.warn({ userId, count: rl.count, limit: RL_LIMIT }, '速率限制超过');
      return rateLimitResponse(rl.retryAfter!);
    }
    log.debug({ count: rl.count, limit: RL_LIMIT }, '速率限制检查通过');

    // 4) 参数验证
    const body = await req.json();
    const validation = validateData(GenerateImageSchema, body);
    if (!validation.success) {
      log.error({ error: validation.error }, '参数验证失败');
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, image_inputs, model } = validation.data;
    log.info({
      promptLength: prompt.length,
      model: model || IMAGE_CHAT_MODEL,
      imageInputsCount: image_inputs?.length || 0,
    }, '参数验证通过');

    // 5) 构建请求内容
    const composedPrompt = composePrompt(prompt);
    const chatContent: ChatContentItem[] = [{ type: 'text', text: composedPrompt }];

    if (Array.isArray(image_inputs)) {
      const picked = image_inputs
        .filter((s) =>
          typeof s === 'string' &&
          (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://'))
        )
        .slice(0, 3);

      log.debug({ count: picked.length }, '处理图片输入');

      for (let i = 0; i < picked.length; i++) {
        try {
          const base64Url = await convertUrlToBase64(picked[i]);
          chatContent.push({ type: 'image_url', image_url: { url: base64Url } });
        } catch (error) {
          log.warn({ index: i, error: error instanceof Error ? error.message : 'Unknown error' }, '跳过图片（转换失败）');
        }
      }
    }

    // 6) 调用上游 API
    const requestData = {
      model: model || IMAGE_CHAT_MODEL,
      temperature: 0.2,
      top_p: 0.7,
      messages: [{ role: 'user', content: chatContent }],
      stream: true,
      stream_options: { include_usage: true },
    };

    const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;

    log.info({
      model: requestData.model,
      temperature: requestData.temperature,
      contentCount: requestData.messages[0].content.length,
      imageCount: chatContent.filter((item) => item.type === 'image_url').length,
    }, '准备调用上游 API');

    const fetchStartTime = Date.now();
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${IMAGE_API_KEY}`,
      },
      body: JSON.stringify(requestData),
    });
    const fetchDuration = Date.now() - fetchStartTime;

    log.info({ status: upstreamResponse.status, duration: `${fetchDuration}ms` }, '收到上游响应');

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      log.error({ status: upstreamResponse.status, error: errorData }, '上游 API 返回错误');
      return new Response(
        JSON.stringify({ error: `API请求失败: ${upstreamResponse.status} ${errorData}` }),
        { status: upstreamResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    log.info('开始转发流式响应');

    return new Response(upstreamResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: message, stack: err instanceof Error ? err.stack : undefined }, '请求处理失败');
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
