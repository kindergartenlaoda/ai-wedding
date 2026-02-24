import { NextResponse } from 'next/server';
import { GenerateImageSchema, validateData } from '@/lib/validations';
import { requireAuth } from '@/lib/auth-api';

type ChatContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export const runtime = 'nodejs';

// 从环境变量读取配置（服务端安全，不以 NEXT_PUBLIC_ 开头）
// 兼容两套命名：优先使用 IMAGE_*，否则回退到 OPENAI_*
const IMAGE_API_BASE_URL = process.env.IMAGE_API_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
const IMAGE_IMAGE_MODEL = process.env.IMAGE_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || process.env.OPENAI_MODEL || 'dall-e-3';
// chat/completions 模式用于部分兼容 OpenAI 的供应商（例如示例中的 gemini-2.5-flash-image）
const IMAGE_CHAT_MODEL = process.env.IMAGE_CHAT_MODEL || IMAGE_IMAGE_MODEL || 'gemini-2.5-flash-image';
// 控制调用后端：'images'（默认，/v1/images/generations）或 'chat'（/v1/chat/completions 并从 Markdown 中提取 Base64 图片）
const IMAGE_API_MODE = (process.env.IMAGE_API_MODE || 'images').toLowerCase();

// 简单用户级限流：每个用户ID在时间窗内最多请求 N 次
const RL_WINDOW_MS = 60 * 1000; // 1分钟
const RL_LIMIT = 5; // 每分钟 5 次
type RLRecord = { windowStart: number; count: number };
// Edge 运行时下的全局内存（同区域生效）
const rateBucket = new Map<string, RLRecord>();

export async function POST(req: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] ========== 开始处理图片生成请求 ==========`);
  
  try {
    // 日志：环境变量检查
    console.log(`[${requestId}] 环境变量检查:`, {
      IMAGE_API_MODE,
      IMAGE_API_BASE_URL,
      IMAGE_API_KEY: IMAGE_API_KEY ? `${IMAGE_API_KEY.substring(0, 10)}...` : 'missing',
      IMAGE_CHAT_MODEL,
    });

    if (!IMAGE_API_KEY) {
      console.error(`[${requestId}] ❌ IMAGE_API_KEY 未配置`);
      return NextResponse.json(
        { error: 'Server misconfigured: IMAGE_API_KEY/OPENAI_API_KEY is missing' },
        { status: 500 }
      );
    }

    // 1) 认证校验（NextAuth session from cookies）
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
        return NextResponse.json(
          { error: 'Too Many Requests' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rec.windowStart + RL_WINDOW_MS - now) / 1000)) } }
        );
      }
      rec.count += 1;
      rateBucket.set(userId, rec);
    }
    console.log(`[${requestId}] 速率限制检查通过: ${rec?.count || 1}/${RL_LIMIT}`);

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

    // 使用Zod验证输入
    const validation = validateData(GenerateImageSchema, body);
    if (!validation.success) {
      console.error(`[${requestId}] ❌ 参数验证失败:`, validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { prompt, n, size, response_format, model, image_inputs } = validation.data;
    console.log(`[${requestId}] ✅ 参数验证通过:`, {
      prompt: prompt.substring(0, 100) + '...',
      n,
      size,
      response_format,
      model: model || IMAGE_CHAT_MODEL,
      image_inputs_count: image_inputs?.length || 0,
    });

    if (IMAGE_API_MODE === 'chat') {
      console.log(`[${requestId}] 📝 使用 Chat 模式生成图片`);
      
      // 使用 chat/completions 生成图片（返回 Markdown 中的 data:image/...;base64,xxx）
      const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
      console.log(`[${requestId}] API 端点: ${endpoint}`);

      // 非流式，便于服务端统一解析
      const chatContent: ChatContentItem[] = [{ type: 'text', text: prompt.trim() }];

      // 允许最多3张dataURL图像作为参考输入（与 example/image-edit-demo.html 对齐）
      if (Array.isArray(image_inputs)) {
        const picked = image_inputs
          .filter((s) => typeof s === 'string' && s.startsWith('data:image/'))
          .slice(0, 3);
        console.log(`[${requestId}] 图片输入: ${picked.length} 张`);
        for (const dataUrl of picked) {
          const preview = dataUrl.substring(0, 50) + '...' + dataUrl.substring(dataUrl.length - 20);
          console.log(`[${requestId}]   - 图片: ${preview}`);
          chatContent.push({ type: 'image_url', image_url: { url: dataUrl } });
        }
      } else {
        console.log(`[${requestId}] 无图片输入`);
      }

      // 【重要】完全参考 demo 的请求格式
      const chatBody = {
        model: model || IMAGE_CHAT_MODEL,
        temperature: 1,
        top_p: 1,
        messages: [
          {
            role: 'user',
            content: chatContent,
          },
        ],
        stream: false, // 非流式，便于解析
      };

      console.log(`[${requestId}] 📤 发送请求到上游 API:`, {
        endpoint,
        model: chatBody.model,
        temperature: chatBody.temperature,
        top_p: chatBody.top_p,
        messages_count: chatBody.messages.length,
        content_items: chatBody.messages[0].content.length,
      });

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

      console.log(`[${requestId}] 📥 收到响应: ${res.status} ${res.statusText} (耗时: ${fetchDuration}ms)`);

      const data = await res.json();
      
      if (!res.ok) {
        console.error(`[${requestId}] ❌ 上游 API 返回错误:`, {
          status: res.status,
          statusText: res.statusText,
          error: data?.error || data,
        });
        return NextResponse.json(
          { error: data?.error || data || 'Image generation failed' },
          { status: res.status }
        );
      }

      console.log(`[${requestId}] 📦 上游 API 响应数据:`, {
        choices_count: data?.choices?.length,
        has_content: !!data?.choices?.[0]?.message?.content,
        content_length: data?.choices?.[0]?.message?.content?.length,
      });

      // 解析返回中的 Markdown 图片，提取 Base64 数据
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content) {
        console.error(`[${requestId}] ❌ 响应中没有有效内容`);
        return NextResponse.json(
          { error: 'Invalid chat completion content' },
          { status: 502 }
        );
      }

      console.log(`[${requestId}] 📄 返回内容预览:`, content.substring(0, 200) + '...');

      // 匹配 Markdown 图片中的 Base64 数据
      // 兼容 Markdown 图片内可能出现的换行/空白
      const mdImageRegex = /!\[[^\]]*\]\(data:image\/([a-zA-Z0-9.+-]+);base64,\s*([\sA-Za-z0-9+/=]+)\)/;
      const match = content.match(mdImageRegex);
      
      if (!match) {
        console.error(`[${requestId}] ❌ 无法从响应中提取图片数据`);
        console.error(`[${requestId}] 完整内容:`, content);
        return NextResponse.json(
          { error: 'No image data found in completion content', raw_content: content.substring(0, 500) },
          { status: 502 }
        );
      }

      const mimeType = match[1];
      const b64 = match[2].replace(/\s+/g, '');
      console.log(`[${requestId}] ✅ 成功提取图片数据:`, {
        mimeType,
        base64_length: b64.length,
        estimated_size_kb: Math.round(b64.length * 0.75 / 1024),
      });

      const outItems = Array.from({ length: Math.max(1, Math.min(8, n || 1)) }, () => ({
        b64_json: b64,
        mime: `image/${mimeType}`,
        data_url: `data:image/${mimeType};base64,${b64}`,
      }));

      // 将生成结果上传到对象存储，并返回 URL
      const origin = new URL(req.url).origin;
      const cookieHeader = req.headers.get('cookie') || '';
      const folder = `single-shot/${Date.now()}`;

      const uploaded: string[] = [];
      for (const item of outItems) {
        const dataUrl: string = item.data_url || (item.b64_json ? `data:image/${mimeType};base64,${item.b64_json}` : '');
        if (!dataUrl) continue;
        try {
          const up = await fetch(`${origin}/api/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookieHeader,
            },
            body: JSON.stringify({ image: dataUrl, folder }),
          });
          if (up.ok) {
            const payload = await up.json();
            // 优先使用预签名URL，24小时有效且可直接访问
            uploaded.push(payload.presignedUrl || payload.url || dataUrl);
          } else {
            console.warn(`[${requestId}] 上传失败（chat 模式），使用 dataURL 回退`);
            uploaded.push(dataUrl);
          }
        } catch (e) {
          console.warn(`[${requestId}] 调用上传接口异常（chat 模式），使用 dataURL 回退:`, e);
          uploaded.push(dataUrl);
        }
      }

      const out = { data: { data: uploaded.map((url) => ({ url })) } };

      console.log(`[${requestId}] ✅ 图片生成成功并已存储，返回 ${uploaded.length} 个 URL`);
      console.log(`[${requestId}] ========== 请求处理完成 ==========`);

      return NextResponse.json(
        out,
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    } else {
      console.log(`[${requestId}] 📝 使用 Images 模式生成图片`);
      
      // 默认使用 OpenAI 兼容的 images/generations 接口
      const endpoint = `${IMAGE_API_BASE_URL.replace(/\/$/, '')}/v1/images/generations`;
      console.log(`[${requestId}] API 端点: ${endpoint}`);

      // 为了统一上传到对象存储，强制请求上游返回 b64_json
      const payload = {
        model: model || IMAGE_IMAGE_MODEL,
        prompt: prompt.trim(),
        n,
        size,
        response_format: 'b64_json' as const,
      };

      console.log(`[${requestId}] 📤 发送请求到上游 API:`, {
        endpoint,
        model: payload.model,
        prompt: payload.prompt.substring(0, 100) + '...',
        n: payload.n,
        size: payload.size,
        response_format: payload.response_format,
      });

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

      console.log(`[${requestId}] 📥 收到响应: ${res.status} ${res.statusText} (耗时: ${fetchDuration}ms)`);

      const upstreamData = await res.json();

      if (!res.ok) {
        console.error(`[${requestId}] ❌ 上游 API 返回错误:`, {
          status: res.status,
          statusText: res.statusText,
          error: upstreamData?.error || upstreamData,
        });
        return NextResponse.json(
          { error: upstreamData?.error || upstreamData || 'Image generation failed' },
          { status: res.status }
        );
      }

      const items: Array<{ b64_json?: string; url?: string }> = upstreamData?.data || [];

      // 将上游的 b64_json 转为 dataURL 并上传到对象存储
      const origin = new URL(req.url).origin;
      const cookieHeader = req.headers.get('cookie') || '';
      const folder = `single-shot/${Date.now()}`;

      const uploaded: string[] = [];
      for (const it of items) {
        let dataUrl = '';
        if (it.b64_json) {
          dataUrl = `data:image/png;base64,${it.b64_json}`;
        } else if (it.url) {
          // 理论上不会发生（我们强制 b64_json），如发生则退化为直接返回原 URL
          uploaded.push(it.url);
          continue;
        }
        if (!dataUrl) continue;
        try {
          const up = await fetch(`${origin}/api/upload-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookieHeader,
            },
            body: JSON.stringify({ image: dataUrl, folder }),
          });
          if (up.ok) {
            const payload = await up.json();
            // 优先使用预签名URL，24小时有效且可直接访问
            uploaded.push(payload.presignedUrl || payload.url || dataUrl);
          } else {
            console.warn(`[${requestId}] 上传失败（images 模式），使用 dataURL 回退`);
            uploaded.push(dataUrl);
          }
        } catch (e) {
          console.warn(`[${requestId}] 调用上传接口异常（images 模式），使用 dataURL 回退:`, e);
          uploaded.push(dataUrl);
        }
      }

      console.log(`[${requestId}] ✅ 图片生成成功并已存储，数量: ${uploaded.length}`);
      console.log(`[${requestId}] ========== 请求处理完成 ==========`);

      return NextResponse.json(
        { data: { data: uploaded.map((url) => ({ url })) } },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[${requestId}] ❌ 发生异常:`, {
      message,
      stack,
      error: err,
    });
    console.error(`[${requestId}] ========== 请求处理失败 ==========`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
