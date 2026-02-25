import { NextResponse } from 'next/server';
import { GenerateImageSchema, validateData } from '@/lib/validations';
import { requireAuth } from '@/lib/auth-api';
import { createRequestLogger, sanitize } from '@/lib/logger';
import {
  checkRateLimit,
  rateLimitResponse,
  RL_LIMIT,
  convertUrlToBase64,
} from '@/lib/generation-shared';
import type { ChatContentItem } from '@/lib/generation-shared';

export const runtime = 'nodejs';

// 从环境变量读取配置
const IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
const IMAGE_IMAGE_MODEL = process.env.IMAGE_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || process.env.OPENAI_MODEL || 'dall-e-3';
const IMAGE_CHAT_MODEL = process.env.IMAGE_CHAT_MODEL || IMAGE_IMAGE_MODEL || 'gemini-2.5-flash-image';
const IMAGE_API_MODE = (process.env.IMAGE_API_MODE || 'images').toLowerCase();

export async function POST(req: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-image', requestId);

  log.info('开始处理图片生成请求');

  try {
    log.debug({
      mode: IMAGE_API_MODE,
      baseUrl: IMAGE_API_BASE_URL,
      apiKey: sanitize.apiKey(IMAGE_API_KEY),
      chatModel: IMAGE_CHAT_MODEL,
    }, '环境变量检查');

    if (!IMAGE_API_KEY) {
      log.error('IMAGE_API_KEY 未配置');
      return NextResponse.json(
        { error: 'Server misconfigured: IMAGE_API_KEY/OPENAI_API_KEY is missing' },
        { status: 500 }
      );
    }

    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;
    log.info({ userId }, '用户认证成功');

    // 2) 速率限制
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      log.warn({ userId, limit: RL_LIMIT }, '速率限制超过');
      return rateLimitResponse(rl.retryAfter!);
    }
    log.debug({ count: rl.count, limit: RL_LIMIT }, '速率限制检查通过');

    // 3) 参数验证
    const body = await req.json();
    const validation = validateData(GenerateImageSchema, body);
    if (!validation.success) {
      log.error({ error: validation.error }, '参数验证失败');
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { prompt, n, size, model, image_inputs } = validation.data;
    log.info({
      prompt: sanitize.truncate(prompt),
      n,
      size,
      model: model || IMAGE_CHAT_MODEL,
      imageInputsCount: image_inputs?.length || 0,
    }, '参数验证通过');

    if (IMAGE_API_MODE === 'chat') {
      return handleChatMode(req, log, { prompt, n, model, image_inputs });
    } else {
      return handleImagesMode(req, log, { prompt, n, size, model });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: message, stack: err instanceof Error ? err.stack : undefined }, '发生异常');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Chat 模式（chat/completions） ─────────────────────────

interface ChatModeParams {
  prompt: string;
  n?: number;
  model?: string;
  image_inputs?: string[];
}

async function handleChatMode(
  req: Request,
  log: ReturnType<typeof createRequestLogger>,
  params: ChatModeParams,
) {
  const { prompt, n, model, image_inputs } = params;

  log.info('使用 Chat 模式生成图片');

  const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
  const chatContent: ChatContentItem[] = [{ type: 'text', text: prompt.trim() }];

  // 添加图片输入（最多 3 张 dataURL）
  if (Array.isArray(image_inputs)) {
    const picked = image_inputs
      .filter((s) => typeof s === 'string' && s.startsWith('data:image/'))
      .slice(0, 3);
    for (const dataUrl of picked) {
      chatContent.push({ type: 'image_url', image_url: { url: dataUrl } });
    }
    log.debug({ count: picked.length }, '图片输入');
  }

  const chatBody = {
    model: model || IMAGE_CHAT_MODEL,
    temperature: 1,
    top_p: 1,
    messages: [{ role: 'user', content: chatContent }],
    stream: false,
  };

  log.info({ endpoint, model: chatBody.model, contentItems: chatContent.length }, '发送请求到上游 API');

  const fetchStartTime = Date.now();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${IMAGE_API_KEY}`,
    },
    body: JSON.stringify(chatBody),
  });
  const fetchDuration = Date.now() - fetchStartTime;

  log.info({ status: res.status, duration: `${fetchDuration}ms` }, '收到响应');

  const data = await res.json();

  if (!res.ok) {
    log.error({ status: res.status, error: data?.error || data }, '上游 API 返回错误');
    return NextResponse.json({ error: data?.error || data || 'Image generation failed' }, { status: res.status });
  }

  // 解析返回中的 Markdown 图片
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) {
    log.error('响应中没有有效内容');
    return NextResponse.json({ error: 'Invalid chat completion content' }, { status: 502 });
  }

  const mdImageRegex = /!\[[^\]]*\]\(data:image\/([a-zA-Z0-9.+-]+);base64,\s*([\sA-Za-z0-9+/=]+)\)/;
  const match = content.match(mdImageRegex);

  if (!match) {
    log.error({ content: sanitize.truncate(content, 500) }, '无法从响应中提取图片数据');
    return NextResponse.json(
      { error: 'No image data found in completion content', raw_content: content.substring(0, 500) },
      { status: 502 }
    );
  }

  const mimeType = match[1];
  const b64 = match[2].replace(/\s+/g, '');
  log.info({ mimeType, estimatedSizeKb: Math.round(b64.length * 0.75 / 1024) }, '成功提取图片数据');

  const outItems = Array.from({ length: Math.max(1, Math.min(8, n || 1)) }, () => ({
    data_url: `data:image/${mimeType};base64,${b64}`,
  }));

  // 上传到对象存储
  const uploaded = await uploadImages(req, log, outItems.map(i => i.data_url), 'chat');

  return NextResponse.json(
    { data: { data: uploaded.map((url) => ({ url })) } },
    { headers: noCacheHeaders() }
  );
}

// ─── Images 模式（images/generations） ──────────────────────

interface ImagesModeParams {
  prompt: string;
  n?: number;
  size?: string;
  model?: string;
}

async function handleImagesMode(
  req: Request,
  log: ReturnType<typeof createRequestLogger>,
  params: ImagesModeParams,
) {
  const { prompt, n, size, model } = params;

  log.info('使用 Images 模式生成图片');

  const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/images/generations`;
  const payload = {
    model: model || IMAGE_IMAGE_MODEL,
    prompt: prompt.trim(),
    n,
    size,
    response_format: 'b64_json' as const,
  };

  log.info({ endpoint, model: payload.model, prompt: sanitize.truncate(payload.prompt) }, '发送请求到上游 API');

  const fetchStartTime = Date.now();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${IMAGE_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const fetchDuration = Date.now() - fetchStartTime;

  log.info({ status: res.status, duration: `${fetchDuration}ms` }, '收到响应');

  const upstreamData = await res.json();

  if (!res.ok) {
    log.error({ status: res.status, error: upstreamData?.error || upstreamData }, '上游 API 返回错误');
    return NextResponse.json(
      { error: upstreamData?.error || upstreamData || 'Image generation failed' },
      { status: res.status }
    );
  }

  const items: Array<{ b64_json?: string; url?: string }> = upstreamData?.data || [];

  // 将 b64_json 转为 dataURL 并上传
  const dataUrls: string[] = [];
  const directUrls: string[] = [];

  for (const it of items) {
    if (it.b64_json) {
      dataUrls.push(`data:image/png;base64,${it.b64_json}`);
    } else if (it.url) {
      directUrls.push(it.url);
    }
  }

  const uploaded = [...directUrls, ...(await uploadImages(req, log, dataUrls, 'images'))];

  log.info({ count: uploaded.length }, '图片生成成功并已存储');

  return NextResponse.json(
    { data: { data: uploaded.map((url) => ({ url })) } },
    { headers: noCacheHeaders() }
  );
}

// ─── 辅助函数 ───────────────────────────────────────────────

async function uploadImages(
  req: Request,
  log: ReturnType<typeof createRequestLogger>,
  dataUrls: string[],
  mode: string,
): Promise<string[]> {
  const origin = new URL(req.url).origin;
  const cookieHeader = req.headers.get('cookie') || '';
  const folder = `single-shot/${Date.now()}`;
  const uploaded: string[] = [];

  for (const dataUrl of dataUrls) {
    if (!dataUrl) continue;
    try {
      const up = await fetch(`${origin}/api/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({ image: dataUrl, folder }),
      });
      if (up.ok) {
        const payload = await up.json();
        uploaded.push(payload.presignedUrl || payload.url || dataUrl);
      } else {
        log.warn(`上传失败（${mode} 模式），使用 dataURL 回退`);
        uploaded.push(dataUrl);
      }
    } catch (e) {
      log.warn({ error: e }, `调用上传接口异常（${mode} 模式），使用 dataURL 回退`);
      uploaded.push(dataUrl);
    }
  }

  return uploaded;
}

function noCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}
