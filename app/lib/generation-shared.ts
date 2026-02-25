/**
 * 图片生成 API 共享模块
 *
 * 提取自 generate-image、generate-stream、generate-single 三个 API route 的共同逻辑。
 * 消除重复代码，统一行为。
 */

import { prisma } from '@/lib/prisma';
import type { ModelConfig } from '@/types/model-config';
import { ModelConfigType } from '../../generated/prisma/enums';
import type { Logger } from 'pino';

// ─── 类型定义 ───────────────────────────────────────────────

export type ChatContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// ─── 速率限制 ───────────────────────────────────────────────

const RL_WINDOW_MS = 60 * 1000; // 1 分钟
const RL_LIMIT = 5;             // 每分钟 5 次

type RLRecord = { windowStart: number; count: number };
const rateBucket = new Map<string, RLRecord>();

interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfter?: number;
}

/**
 * 检查用户速率限制
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const rec = rateBucket.get(userId);

  if (!rec || now - rec.windowStart >= RL_WINDOW_MS) {
    rateBucket.set(userId, { windowStart: now, count: 1 });
    return { allowed: true, count: 1 };
  }

  if (rec.count >= RL_LIMIT) {
    return {
      allowed: false,
      count: rec.count,
      retryAfter: Math.ceil((rec.windowStart + RL_WINDOW_MS - now) / 1000),
    };
  }

  rec.count += 1;
  rateBucket.set(userId, rec);
  return { allowed: true, count: rec.count };
}

/**
 * 构建速率限制错误响应
 */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too Many Requests' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

export { RL_LIMIT };

// ─── 模型配置 ───────────────────────────────────────────────

const SOURCE_MAP: Record<string, 'openRouter' | 'openAi' | 'source_302'> = {
  openRouter: 'openRouter',
  openAi: 'openAi',
  '302': 'source_302',
};

/**
 * 从数据库获取激活的模型配置
 *
 * @param log - Pino logger 实例
 * @param type - 模型配置类型（默认 generate_image）
 * @param source - 可选的 source 过滤
 */
export async function getActiveModelConfig(
  log: Logger,
  type: ModelConfigType = ModelConfigType.generate_image,
  source?: string,
): Promise<ModelConfig | null> {
  try {
    const prismaSource = source ? SOURCE_MAP[source] : undefined;
    const config = await prisma.modelConfig.findFirst({
      where: {
        type,
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
    log.error({ error: err }, '获取激活配置异常');
    return null;
  }
}

// ─── 图片转换 ───────────────────────────────────────────────

/**
 * 将 URL 转换为 base64 格式的 Data URL。
 * 如果输入已经是 data URL，则直接返回。
 */
export async function convertUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = blob.type || 'image/jpeg';

  return `data:${mimeType};base64,${base64}`;
}

// ─── 提示词模板 ─────────────────────────────────────────────

const FACE_PRESERVATION =
  'STRICT REQUIREMENTS:\n' +
  '1. ABSOLUTELY preserve all facial features, facial contours, eye shape, nose shape, mouth shape, and all key characteristics from the original image\n' +
  "2. Maintain the person's basic facial structure and proportions COMPLETELY unchanged\n" +
  '3. Ensure the person in the edited image is 100% recognizable as the same individual\n' +
  '4. NO changes to any facial details including skin texture, moles, scars, or other distinctive features\n' +
  '5. If style conversion is involved, MUST maintain facial realism and accuracy\n' +
  '6. Focus ONLY on non-facial modifications as requested';

const TEMPLATE_REGEX = /STRICT REQUIREMENTS|Please edit the provided original image|SPECIFIC EDITING REQUEST/i;

/**
 * 将用户输入的提示词包裹为标准模板。
 * 若用户已包含关键锚点，则原样返回，避免重复注入。
 */
export function composePrompt(userPrompt: string): string {
  const p = (userPrompt || '').trim();
  if (TEMPLATE_REGEX.test(p)) return p;

  return [
    'Please edit the provided original image based on the following guidelines:',
    '',
    FACE_PRESERVATION,
    '',
    `SPECIFIC EDITING REQUEST: ${p}`,
    '',
    "Please focus your modifications ONLY on the user's specific requirements while strictly following the face preservation guidelines above. Generate a high-quality edited image that maintains facial identity.",
  ].join('\n');
}

// ─── 敏感数据过滤 ───────────────────────────────────────────

/**
 * 递归过滤对象中的敏感数据（base64、长字符串等）
 */
export function filterSensitiveData(obj: unknown): unknown {
  if (typeof obj === 'string' && obj.length > 1000) {
    return `<数据已省略，长度: ${obj.length}>`;
  }
  if (Array.isArray(obj)) {
    return obj.map(filterSensitiveData);
  }
  if (obj && typeof obj === 'object') {
    const filtered: Record<string, unknown> = {};
    const o = obj as Record<string, unknown>;
    for (const key in o) {
      if ((key === 'data' || key === 'b64_json') && typeof o[key] === 'string' && (o[key] as string).length > 1000) {
        filtered[key] = `<base64数据已省略，长度: ${(o[key] as string).length}>`;
      } else {
        filtered[key] = filterSensitiveData(o[key]);
      }
    }
    return filtered;
  }
  return obj;
}
