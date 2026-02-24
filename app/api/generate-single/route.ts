import { GenerateImageSchema, validateData } from '@/lib/validations';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import type { ModelConfig } from '@/types/model-config';
import { ModelConfigType } from '../../../generated/prisma/enums';

export const runtime = 'nodejs';

const ENV_IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL;
const ENV_IMAGE_API_KEY = process.env.IMAGE_API_KEY;
const ENV_IMAGE_CHAT_MODEL = process.env.IMAGE_CHAT_MODEL || 'gemini-2.5-flash-image';

const CREDITS_PER_GENERATION = 15;

/**
 * 将 URL 转换为 base64 格式的 Data URL
 * 如果输入已经是 data URL，则直接返回
 */
async function convertUrlToBase64(url: string): Promise<string> {
  // 如果已经是 data URL，直接返回
  if (url.startsWith('data:')) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = blob.type || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to convert URL to base64: ${message}`);
  }
}

async function getActiveModelConfig(source?: string): Promise<ModelConfig | null> {
  try {
    const sourceMap = { openRouter: 'openRouter' as const, openAi: 'openAi' as const, '302': 'source_302' as const };
    const prismaSource = source && sourceMap[source as keyof typeof sourceMap] ? sourceMap[source as keyof typeof sourceMap] : undefined;
    const config = await prisma.modelConfig.findFirst({
      where: {
        type: ModelConfigType.generate_image,
        status: 'active',
        ...(prismaSource && { source: prismaSource }),
      },
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
    console.error('获取激活配置异常:', err);
    return null;
  }
}

// 简单用户级限流
const RL_WINDOW_MS = 60 * 1000; // 1分钟
const RL_LIMIT = 5; // 每分钟 5 次
type RLRecord = { windowStart: number; count: number };
const rateBucket = new Map<string, RLRecord>();

/**
 * 将用户输入的提示词包裹为标准模板，以匹配成功案例格式。
 */
function composePrompt(userPrompt: string): string {
  const p = (userPrompt || '').trim();
  // 若已包含模板关键字，则原样返回，避免重复注入
  const hasTemplate = /STRICT REQUIREMENTS|Please edit the provided original image|SPECIFIC EDITING REQUEST/i.test(p);
  if (hasTemplate) return p;

  const FACE_PRESERVATION =
    'STRICT REQUIREMENTS:\n' +
    '1. ABSOLUTELY preserve all facial features, facial contours, eye shape, nose shape, mouth shape, and all key characteristics from the original image\n' +
    "2. Maintain the person's basic facial structure and proportions COMPLETELY unchanged\n" +
    '3. Ensure the person in the edited image is 100% recognizable as the same individual\n' +
    '4. NO changes to any facial details including skin texture, moles, scars, or other distinctive features\n' +
    '5. If style conversion is involved, MUST maintain facial realism and accuracy\n' +
    '6. Focus ONLY on non-facial modifications as requested';

  const INTRO = 'Please edit the provided original image based on the following guidelines:';
  const CLOSING = "Please focus your modifications ONLY on the user's specific requirements while strictly following the face preservation guidelines above. Generate a high-quality edited image that maintains facial identity.";

  return `${INTRO}\n\n${FACE_PRESERVATION}\n\nSPECIFIC EDITING REQUEST: ${p}\n\n${CLOSING}`;
}

export async function POST(req: Request) {
  const requestId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ========== 开始处理单图生成请求（带积分抵扣） ==========`);

  try {
    // 1) 认证校验
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;
    console.log(`[${requestId}] ✅ 用户认证成功: ${userId}`);

    // 2) 速率限制（按用户维度）
    const now = Date.now();
    const rec = rateBucket.get(userId);
    if (!rec || now - rec.windowStart >= RL_WINDOW_MS) {
      rateBucket.set(userId, { windowStart: now, count: 1 });
    } else {
      if (rec.count >= RL_LIMIT) {
        console.warn(`[${requestId}] ⚠️ 速率限制: 用户 ${userId} 超过限制`);
        return new Response(
          JSON.stringify({ error: 'Too Many Requests' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rec.windowStart + RL_WINDOW_MS - now) / 1000)),
            },
          }
        );
      }
      rec.count += 1;
      rateBucket.set(userId, rec);
    }
    console.log(`[${requestId}] 速率限制检查通过: ${rec?.count || 1}/${RL_LIMIT}`);

    // 3) 检查用户积分
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { credits: true },
    });

    if (!profile) {
      console.error(`[${requestId}] ❌ 获取用户信息失败`);
      return new Response(
        JSON.stringify({ error: '无法获取用户信息' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] 用户积分余额: ${profile.credits}`);

    if (profile.credits < CREDITS_PER_GENERATION) {
      console.warn(`[${requestId}] ❌ 积分不足: 当前 ${profile.credits}, 需要 ${CREDITS_PER_GENERATION}`);
      return new Response(
        JSON.stringify({
          error: '积分不足',
          current_credits: profile.credits,
          required_credits: CREDITS_PER_GENERATION,
          message: `当前积分 ${profile.credits}，需要 ${CREDITS_PER_GENERATION} 积分才能生成`
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4) 扣除积分
    try {
      await prisma.profile.update({
        where: { userId },
        data: { credits: profile.credits - CREDITS_PER_GENERATION },
      });
    } catch (deductError) {
      console.error(`[${requestId}] ❌ 扣除积分失败:`, deductError);
      return new Response(
        JSON.stringify({ error: '扣除积分失败，请重试' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] ✅ 成功扣除 ${CREDITS_PER_GENERATION} 积分，剩余: ${profile.credits - CREDITS_PER_GENERATION}`);

    // 6) 参数验证
    const body = await req.json();
    
    // 过滤 base64 数据用于日志打印
    const logBody = {
      ...body,
      image_inputs: body.image_inputs?.map((img: string) => {
        if (img.startsWith('data:image')) {
          return `data:image/...[base64 ${img.length} 字符]`;
        }
        return img;
      })
    };
    console.log(`[${requestId}] 请求 Body:`, JSON.stringify(logBody, null, 2));

    const validation = validateData(GenerateImageSchema, body);
    if (!validation.success) {
      console.error(`[${requestId}] ❌ 参数验证失败:`, validation.error);
      // 退还积分
      await prisma.profile.update({
        where: { userId },
        data: { credits: profile.credits },
      });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, image_inputs, model, source, temperature, top_p } = validation.data;

    // 6.5) 获取模型配置（优先从数据库，回退到环境变量）
    const dbConfig = await getActiveModelConfig(source);

    let IMAGE_API_BASE_URL: string;
    let IMAGE_API_KEY: string;
    let IMAGE_CHAT_MODEL: string;

    if (dbConfig) {
      console.log(`[${requestId}] ✅ 使用数据库配置: ${dbConfig.name} (ID: ${dbConfig.id}, Source: ${dbConfig.source})`);
      IMAGE_API_BASE_URL = dbConfig.api_base_url;
      IMAGE_API_KEY = dbConfig.api_key;
      IMAGE_CHAT_MODEL = dbConfig.model_name;
    } else {
      if (source) {
        console.warn(`[${requestId}] ⚠️ 未找到 source=${source} 的激活配置，回退到默认环境变量`);
      } else {
        console.log(`[${requestId}] ⚠️ 未找到激活的数据库配置，使用环境变量回退`);
      }
      IMAGE_API_BASE_URL = ENV_IMAGE_API_BASE_URL || '';
      IMAGE_API_KEY = ENV_IMAGE_API_KEY || '';
      IMAGE_CHAT_MODEL = ENV_IMAGE_CHAT_MODEL;
    }

    // 打印参数验证结果（此时已知最终使用的模型）
    console.log(`[${requestId}] ✅ 参数验证通过:`, {
      prompt: prompt.substring(0, 100) + '...',
      frontend_model: model || '(未指定)',
      final_model: IMAGE_CHAT_MODEL, // 最终使用的模型（从配置获取）
      source: source || 'default',
      image_inputs_count: image_inputs?.length || 0,
      temperature: temperature ?? 0.2,
      top_p: top_p ?? 0.7,
    });

    if (!IMAGE_API_KEY) {
      console.error(`[${requestId}] ❌ IMAGE_API_KEY 未配置`);
      // 退还积分
      await prisma.profile.update({
        where: { userId },
        data: { credits: profile.credits },
      });
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: IMAGE_API_KEY is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7) 根据 source 决定请求格式
    const composedPrompt = composePrompt(prompt);

    // 检查是否为 302.ai（使用 Gemini 原生格式）
    const is302AI = source === '302' || IMAGE_API_BASE_URL.includes('302.ai');

    if (is302AI) {
      console.log(`[${requestId}] 🔄 使用 302.ai Gemini 原生格式`);

      // 302.ai: 构建 Gemini 原生格式请求
      type GeminiPart =
        | { text: string }
        | { inline_data: { mime_type: string; data: string } };

      const parts: GeminiPart[] = [{ text: composedPrompt }];

      // 添加图片（最多3张），使用 inline_data 格式
      if (Array.isArray(image_inputs)) {
        const picked = image_inputs
          .filter((s) =>
            typeof s === 'string' &&
            (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://'))
          )
          .slice(0, 3);
        console.log(`[${requestId}] 图片输入: ${picked.length} 张`);

        for (const url of picked) {
          try {
            let mimeType = 'image/jpeg';
            let base64Data = url;

            // 如果是 data URL，提取 MIME 类型和纯 base64
            if (url.startsWith('data:')) {
              const matches = url.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
              }
            } else {
              // HTTP URL 需要先转换为 base64
              const dataUrl = await convertUrlToBase64(url);
              const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
              }
            }

            console.log(`[${requestId}]   - 图片类型: ${mimeType}, base64 长度: ${base64Data.length}`);

            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[${requestId}] ⚠️ 跳过图片（转换失败）: ${message}`);
          }
        }
      }

      const requestData = {
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };

      // 302.ai 的 endpoint 包含模型名称（不需要 :generateContent 后缀）
      const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/google/v1/models/${IMAGE_CHAT_MODEL}`;
      console.log(`[${requestId}] 📤 调用 302.ai API: ${endpoint}`);

      // 打印请求详情（过滤掉 base64）
      const logRequestData = {
        ...requestData,
        contents: requestData.contents.map(content => ({
          parts: content.parts.map(part => {
            if ('inline_data' in part) {
              return {
                inline_data: {
                  mime_type: part.inline_data.mime_type,
                  data: `<${part.inline_data.data.length} 字符已省略>`,
                },
              };
            }
            return part;
          }),
        })),
      };
      console.log(`[${requestId}] 📋 请求参数:`, JSON.stringify(logRequestData, null, 2));

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

      console.log(`[${requestId}] 📥 收到 302.ai 响应: ${upstreamResponse.status} ${upstreamResponse.statusText} (耗时: ${fetchDuration}ms)`);
      console.log(`[${requestId}] 📋 响应头:`, {
        'content-type': upstreamResponse.headers.get('content-type'),
        'content-length': upstreamResponse.headers.get('content-length'),
        'x-request-id': upstreamResponse.headers.get('x-request-id'),
      });

      if (!upstreamResponse.ok) {
        let errorData = await upstreamResponse.text();

        // 尝试解析错误响应并过滤 base64
        try {
          const errorJson = JSON.parse(errorData);
          // 递归过滤 base64 数据
          const filterBase64 = (obj: unknown): unknown => {
            if (typeof obj === 'string' && obj.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(obj.substring(0, 100))) {
              return `<可能是base64数据，长度: ${obj.length}>`;
            }
            if (Array.isArray(obj)) {
              return obj.map(filterBase64);
            }
            if (obj && typeof obj === 'object') {
              const filtered: Record<string, unknown> = {};
              const o = obj as Record<string, unknown>;
              for (const key in o) {
                if (key === 'data' && typeof o[key] === 'string' && (o[key] as string).length > 1000) {
                  filtered[key] = `<base64数据已省略，长度: ${(o[key] as string).length}>`;
                } else {
                  filtered[key] = filterBase64(o[key]);
                }
              }
              return filtered;
            }
            return obj;
          };

          const filteredError = filterBase64(errorJson);
          errorData = JSON.stringify(filteredError, null, 2);
        } catch {
          // 如果不是 JSON，保持原样（但截断过长的内容）
          if (errorData.length > 2000) {
            errorData = errorData.substring(0, 2000) + '...(已截断)';
          }
        }

        console.error(`[${requestId}] ❌ 302.ai API 返回错误:`, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: Object.fromEntries(upstreamResponse.headers.entries()),
          error: errorData,
        });

        // 退还积分
        await prisma.profile.update({
          where: { userId },
          data: { credits: profile.credits },
        });

        return new Response(
          JSON.stringify({ error: `API请求失败: ${upstreamResponse.status} ${errorData}` }),
          { status: upstreamResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 302.ai 返回非流式 JSON
      const responseData = await upstreamResponse.json();

      // 打印响应数据（过滤 base64）
      const filterBase64FromResponse = (obj: unknown): unknown => {
        if (typeof obj === 'string' && obj.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(obj.substring(0, 100))) {
          return `<可能是base64数据，长度: ${obj.length}>`;
        }
        if (Array.isArray(obj)) {
          return obj.map(filterBase64FromResponse);
        }
        if (obj && typeof obj === 'object') {
          const filtered: Record<string, unknown> = {};
          const o = obj as Record<string, unknown>;
          for (const key in o) {
            if ((key === 'data' || key === 'b64_json') && typeof o[key] === 'string' && (o[key] as string).length > 1000) {
              filtered[key] = `<base64数据已省略，长度: ${(o[key] as string).length}>`;
            } else {
              filtered[key] = filterBase64FromResponse(o[key]);
            }
          }
          return filtered;
        }
        return obj;
      };

      const logResponseData = filterBase64FromResponse(responseData);
      console.log(`[${requestId}] ✅ 302.ai 响应解析成功:`, JSON.stringify(logResponseData, null, 2));

      // 转换为 SSE 流式格式，兼容前端
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          try {
            // 提取图片数据
            if (responseData.candidates && responseData.candidates.length > 0) {
              const candidate = responseData.candidates[0];
              if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                  // 处理文本数据
                  if (part.text) {
                    const chunk = JSON.stringify({
                      choices: [{
                        delta: {
                          content: part.text,
                        },
                      }],
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  }

                  // 处理 URL 格式的图片（302.ai 返回格式）
                  if (part.url) {
                    console.log(`[${requestId}] 📷 提取到图片 URL: ${part.url}`);
                    // 将 URL 包装成 Markdown 格式，前端可以识别
                    const chunk = JSON.stringify({
                      choices: [{
                        delta: {
                          content: `![image](${part.url})`,
                        },
                      }],
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  }

                  // 处理 Base64 格式的图片（inlineData 格式）
                  if (part.inlineData && part.inlineData.data) {
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    const base64Data = part.inlineData.data;
                    const imageDataUrl = `data:${mimeType};base64,${base64Data}`;
                    console.log(`[${requestId}] 📷 提取到 base64 图片，MIME: ${mimeType}, 长度: ${base64Data.length}`);

                    // 模拟流式发送图片（Markdown 格式）
                    const chunk = JSON.stringify({
                      choices: [{
                        delta: {
                          content: `![image](${imageDataUrl})`,
                        },
                      }],
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  }
                }
              }
            }

            // 发送结束标记
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            console.log(`[${requestId}] ✅ 流式转换完成`);
          } catch (error) {
            console.error(`[${requestId}] ❌ 流式转换失败:`, error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // OpenRouter/其他: 使用 OpenAI 兼容格式
      console.log(`[${requestId}] 🔄 使用 OpenAI 兼容格式`);

      type ChatContentItem =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } };

      const chatContent: ChatContentItem[] = [{ type: 'text', text: composedPrompt }];

      // 添加图片输入（最多3张）
      if (Array.isArray(image_inputs)) {
        const picked = image_inputs
          .filter((s) =>
            typeof s === 'string' &&
            (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://'))
          )
          .slice(0, 3);
        console.log(`[${requestId}] 图片输入: ${picked.length} 张`);

        for (const url of picked) {
          try {
            const isDataUrl = url.startsWith('data:');
            const urlType = isDataUrl ? 'Data URL' : url.startsWith('https://') ? 'HTTPS' : 'HTTP';
            console.log(`[${requestId}]   - 图片类型: ${urlType}`);

            const base64Url = await convertUrlToBase64(url);

            if (!isDataUrl) {
              console.log(`[${requestId}]   - ✅ 已转换为 base64, 长度: ${base64Url.length} 字符`);
            }

            chatContent.push({ type: 'image_url', image_url: { url: base64Url } });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[${requestId}] ⚠️ 跳过图片（转换失败）: ${message}`);
          }
        }
      } else {
        console.log(`[${requestId}] 无图片输入`);
      }

      const requestData = {
        model: IMAGE_CHAT_MODEL,
        temperature: temperature ?? 0.2,
        top_p: top_p ?? 0.7,
        messages: [
          {
            role: 'user',
            content: chatContent,
          },
        ],
        stream: true,
        stream_options: {
          include_usage: true,
        },
      };

      const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
      console.log(`[${requestId}] 📤 调用上游 API: ${endpoint}`);

      // 打印请求详情（过滤掉 base64 图片数据）
      const logRequestData = {
        ...requestData,
        messages: requestData.messages.map(msg => ({
          ...msg,
          content: Array.isArray(msg.content)
            ? msg.content.map(item => {
                if (item.type === 'image_url' && item.image_url?.url) {
                  const url = item.image_url.url;
                  const isBase64 = url.startsWith('data:image/');
                  return {
                    type: 'image_url',
                    image_url: {
                      url: isBase64
                        ? `data:image/...;base64,<${url.length} 字符已省略>`
                        : url
                    }
                  };
                }
                return item;
              })
            : msg.content
        }))
      };
      console.log(`[${requestId}] 📋 请求参数:`, JSON.stringify(logRequestData, null, 2));

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

      console.log(`[${requestId}] 📥 收到上游响应: ${upstreamResponse.status} ${upstreamResponse.statusText} (耗时: ${fetchDuration}ms)`);

      if (!upstreamResponse.ok) {
        const errorData = await upstreamResponse.text();
        console.error(`[${requestId}] ❌ 上游 API 返回错误:`, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          error: errorData,
        });

        // 退还积分
        console.log(`[${requestId}] 🔄 退还积分: ${CREDITS_PER_GENERATION}`);
        await prisma.profile.update({
          where: { userId },
          data: { credits: profile.credits },
        });

        return new Response(
          JSON.stringify({ error: `API请求失败: ${upstreamResponse.status} ${errorData}` }),
          { status: upstreamResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] ✅ 开始转发流式响应`);

      // 直接转发流式响应
      return new Response(upstreamResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[${requestId}] ❌ 发生异常:`, {
      message,
      stack,
      error: err,
    });

    // 尝试退还积分（如果已经扣除）
    try {
      const user = await requireAuth();
      if (!(user instanceof Response)) {
        const prof = await prisma.profile.findUnique({
          where: { userId: user.user.id },
          select: { credits: true },
        });
        if (prof) {
          console.log(`[${requestId}] 🔄 异常退还积分: ${CREDITS_PER_GENERATION}`);
          await prisma.profile.update({
            where: { userId: user.user.id },
            data: { credits: prof.credits + CREDITS_PER_GENERATION },
          });
        }
      }
    } catch (refundErr) {
      console.error(`[${requestId}] ❌ 退还积分失败:`, refundErr);
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
