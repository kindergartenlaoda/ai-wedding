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
} from '@/lib/generation-shared';
import type { ChatContentItem, FacePreservationLevel, CreativityLevel } from '@/lib/generation-shared';

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

    // 2) 速率限制
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      log.warn({ userId, count: rl.count, limit: RL_LIMIT }, '速率限制超过');
      return rateLimitResponse(rl.retryAfter!);
    }
    log.debug({ count: rl.count, limit: RL_LIMIT }, '速率限制检查通过');

    // 4) 参数验证（V2：支持 template_id 模式和 custom_prompt 模式）
    const body = await req.json();
    const validation = validateData(GenerateImageV2Schema, body);
    if (!validation.success) {
      log.error({ error: validation.error }, '参数验证失败');
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = validation.data;
    const image_inputs = data.image_inputs;
    const source = data.source;
    const facePreservation = (data.face_preservation || 'high') as FacePreservationLevel;
    const creativityLevel = (data.creativity_level || 'conservative') as CreativityLevel;

    // 5) 解析提示词（服务端完成）
    let rawPrompt: string;
    if ('template_id' in data) {
      try {
        rawPrompt = await resolvePromptFromTemplate(data.template_id, data.prompt_index);
        log.info({ templateId: data.template_id, promptIndex: data.prompt_index }, '从模板解析提示词');
      } catch (resolveErr) {
        log.error({ error: resolveErr }, '模板提示词解析失败');
        return new Response(
          JSON.stringify({ error: resolveErr instanceof Error ? resolveErr.message : '模板提示词解析失败' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      rawPrompt = data.custom_prompt;
      log.info({ promptLength: rawPrompt.length }, '使用自定义提示词');
    }

    const composedPrompt = enhancePromptWithSettings(rawPrompt, facePreservation);
    const { temperature: _mappedTemp, topP: _mappedTopP } = mapCreativityToParams(creativityLevel);

    log.info({
      promptLength: composedPrompt.length,
      imageInputsCount: image_inputs?.length || 0,
      facePreservation,
      creativityLevel,
    }, '参数验证通过');

    // 6) 构建请求内容
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

    // 7) 获取模型配置
    const dbConfig = await getActiveModelConfig(log, undefined, source);

    let apiBaseUrl: string;
    let apiKey: string;
    let chatModel: string;

    if (dbConfig) {
      log.info({ configName: dbConfig.name, configId: dbConfig.id }, '使用数据库配置');
      apiBaseUrl = dbConfig.api_base_url;
      apiKey = dbConfig.api_key;
      chatModel = dbConfig.model_name;
    } else {
      log.warn('未找到激活的数据库配置，使用环境变量回退');
      apiBaseUrl = ENV_IMAGE_API_BASE_URL || '';
      apiKey = ENV_IMAGE_API_KEY || '';
      chatModel = ENV_IMAGE_CHAT_MODEL;
    }

    if (!apiKey) {
      log.error('IMAGE_API_KEY 未配置');
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: IMAGE_API_KEY is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8) 调用上游 API
    const requestData = {
      model: chatModel,
      temperature: _mappedTemp,
      top_p: _mappedTopP,
      messages: [{ role: 'user', content: chatContent }],
      stream: true,
      stream_options: { include_usage: true },
    };

    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;

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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestData),
    });
    const fetchDuration = Date.now() - fetchStartTime;

    log.info({ status: upstreamResponse.status, duration: `${fetchDuration}ms` }, '收到上游响应');

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      log.error({ status: upstreamResponse.status, error: sanitize.errorMessage(errorData) }, '上游 API 返回错误');
      return new Response(
        JSON.stringify({ error: `图片生成失败，请稍后重试` }),
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
