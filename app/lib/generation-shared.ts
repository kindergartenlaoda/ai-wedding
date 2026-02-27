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
export function checkRateLimit(user_id: string): RateLimitResult {
  const now = Date.now();
  const rec = rateBucket.get(user_id);

  if (!rec || now - rec.windowStart >= RL_WINDOW_MS) {
    rateBucket.set(user_id, { windowStart: now, count: 1 });
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
  rateBucket.set(user_id, rec);
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

const SOURCE_MAP: Record<string, 'openRouter' | 'openAi'> = {
  openRouter: 'openRouter',
  openAi: 'openAi',
};

const MODEL_CONFIG_CACHE_TTL_MS = Number(process.env.MODEL_CONFIG_CACHE_TTL_MS || '30000');
type ModelConfigCacheEntry = {
  value: ModelConfig | null;
  expiresAt: number;
};
const modelConfigCache = new Map<string, ModelConfigCacheEntry>();

/**
 * 从数据库获取激活的模型配置（带缓存）
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
  const prismaSource = source ? SOURCE_MAP[source] : undefined;
  const cacheKey = `${type}:${prismaSource ?? 'all'}`;
  const now = Date.now();
  const cached = modelConfigCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  if (cached) modelConfigCache.delete(cacheKey);

  try {
    const config = await prisma.model_configs.findFirst({
      where: {
        type,
        status: 'active',
        ...(prismaSource && { source: prismaSource }),
      },
      orderBy: { updated_at: 'desc' },
    });

    const normalized = config
      ? {
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
        }
      : null;

    modelConfigCache.set(cacheKey, {
      value: normalized,
      expiresAt: now + MODEL_CONFIG_CACHE_TTL_MS,
    });
    return normalized;
  } catch (err) {
    log.error({ error: err }, '获取激活配置异常');
    return cached?.value ?? null;
  }
}

// ─── 图片转换 ───────────────────────────────────────────────

// ─── URL 安全检查 ───────────────────────────────────────────

/**
 * 检查 URL 是否为私网地址或敏感地址
 */
function isPrivateOrSensitiveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // 检查 localhost 和本地回环
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // 检查云元数据服务地址
    const metadataHosts = [
      '169.254.169.254', // AWS, Azure, GCP metadata
      'metadata.google.internal',
      '100.100.100.200', // Alibaba Cloud metadata
    ];
    if (metadataHosts.includes(hostname)) {
      return true;
    }

    // 检查私网 IP 段
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b] = match.map(Number);
      // 10.0.0.0/8
      if (a === 10) return true;
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;
      // 127.0.0.0/8
      if (a === 127) return true;
      // 0.0.0.0/8
      if (a === 0) return true;
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return true;
    }

    return false;
  } catch {
    // URL 解析失败，视为不安全
    return true;
  }
}

/**
 * 允许的图片 MIME 类型白名单
 */
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
];

/**
 * 将 URL 转换为 base64 格式的 Data URL。
 * 如果输入已经是 data URL，则直接返回。
 *
 * 安全措施：
 * - 拦截私网 IP 和敏感地址（SSRF 防护）
 * - 禁用自动重定向（防止重定向绕过）
 * - 超时控制（10秒）
 * - 文件大小限制（10MB）
 * - MIME 类型白名单验证
 */
export async function convertUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;

  // SSRF 防护：检查 URL 安全性
  if (isPrivateOrSensitiveUrl(url)) {
    throw new Error('Access to private or sensitive URLs is not allowed');
  }

  // 超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual', // 禁用自动重定向，防止绕过检查
      headers: {
        'User-Agent': 'AI-Wedding-Image-Generator/1.0',
      },
    });

    clearTimeout(timeoutId);

    // 检查重定向响应
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // 验证重定向目标 URL
        if (isPrivateOrSensitiveUrl(location)) {
          throw new Error('Redirect to private or sensitive URL is not allowed');
        }
        // 递归处理重定向（最多 5 次）
        return convertUrlToBase64WithRedirectCount(location, 1);
      }
      throw new Error('Redirect without location header');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // 检查 Content-Length（如果提供）
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (size > maxSize) {
        throw new Error(`Image size exceeds maximum allowed size (10MB)`);
      }
    }

    // 检查 MIME 类型
    const contentType = response.headers.get('content-type');
    if (contentType && !ALLOWED_IMAGE_MIME_TYPES.includes(contentType.split(';')[0].trim())) {
      throw new Error(`Invalid image MIME type: ${contentType}`);
    }

    const blob = await response.blob();

    // 二次检查实际大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (blob.size > maxSize) {
      throw new Error(`Image size exceeds maximum allowed size (10MB)`);
    }

    // 二次检查 MIME 类型
    const mimeType = blob.type || 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid image MIME type: ${mimeType}`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image fetch timeout (10s limit exceeded)');
    }
    throw error;
  }
}

/**
 * 内部函数：处理重定向并限制重定向次数
 */
async function convertUrlToBase64WithRedirectCount(
  url: string,
  redirectCount: number
): Promise<string> {
  const MAX_REDIRECTS = 5;

  if (redirectCount > MAX_REDIRECTS) {
    throw new Error('Too many redirects');
  }

  if (url.startsWith('data:')) return url;

  // SSRF 防护：检查 URL 安全性
  if (isPrivateOrSensitiveUrl(url)) {
    throw new Error('Access to private or sensitive URLs is not allowed');
  }

  // 超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'AI-Wedding-Image-Generator/1.0',
      },
    });

    clearTimeout(timeoutId);

    // 检查重定向响应
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        if (isPrivateOrSensitiveUrl(location)) {
          throw new Error('Redirect to private or sensitive URL is not allowed');
        }
        return convertUrlToBase64WithRedirectCount(location, redirectCount + 1);
      }
      throw new Error('Redirect without location header');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // 检查 Content-Length
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 10 * 1024 * 1024;
      if (size > maxSize) {
        throw new Error(`Image size exceeds maximum allowed size (10MB)`);
      }
    }

    // 检查 MIME 类型
    const contentType = response.headers.get('content-type');
    if (contentType && !ALLOWED_IMAGE_MIME_TYPES.includes(contentType.split(';')[0].trim())) {
      throw new Error(`Invalid image MIME type: ${contentType}`);
    }

    const blob = await response.blob();

    // 二次检查实际大小
    const maxSize = 10 * 1024 * 1024;
    if (blob.size > maxSize) {
      throw new Error(`Image size exceeds maximum allowed size (10MB)`);
    }

    // 二次检查 MIME 类型
    const mimeType = blob.type || 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Invalid image MIME type: ${mimeType}`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image fetch timeout (10s limit exceeded)');
    }
    throw error;
  }
}

// ─── 模板缓存 ───────────────────────────────────────────────

const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟
type TemplateCacheEntry = {
  template: {
    prompt_config: unknown;
    prompt_list: unknown;
    is_active: boolean;
  };
  expiresAt: number;
};
const templateCache = new Map<string, TemplateCacheEntry>();

/**
 * 从缓存或数据库获取模板
 */
async function getTemplateFromCacheOrDb(templateId: string) {
  const now = Date.now();
  const cached = templateCache.get(templateId);

  if (cached && cached.expiresAt > now) {
    return cached.template;
  }

  // 缓存过期或不存在，从数据库查询
  const template = await prisma.templates.findUnique({
    where: { id: templateId },
    select: { prompt_config: true, prompt_list: true, is_active: true },
  });

  if (template) {
    templateCache.set(templateId, {
      template,
      expiresAt: now + TEMPLATE_CACHE_TTL_MS,
    });
  }

  return template;
}

/**
 * 清除模板缓存（Admin 更新模板时调用）
 */
export function clearTemplateCache(templateId?: string) {
  if (templateId) {
    templateCache.delete(templateId);
  } else {
    templateCache.clear();
  }
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

// ─── 提示词后端解析 ─────────────────────────────────────────

/**
 * 从数据库模板中解析提示词（服务端专用）
 */
export async function resolvePromptFromTemplate(
  templateId: string,
  promptIndex: number = 0
): Promise<string> {
  const template = await getTemplateFromCacheOrDb(templateId);

  if (!template) throw new Error('模板不存在');
  if (!template.is_active) throw new Error('模板已停用');

  const promptList = Array.isArray(template.prompt_list)
    ? (template.prompt_list as string[]).filter(Boolean)
    : [];

  if (promptList.length > 0) {
    // 越界检查：如果 promptIndex 超出范围，返回明确错误
    if (promptIndex < 0 || promptIndex >= promptList.length) {
      throw new Error(
        `Invalid prompt_index: must be between 0 and ${promptList.length - 1}, got ${promptIndex}`
      );
    }
    return promptList[promptIndex];
  }

  const config = (template.prompt_config && typeof template.prompt_config === 'object')
    ? template.prompt_config as Record<string, unknown>
    : {};
  const basePrompt = typeof config.basePrompt === 'string' ? config.basePrompt : '';
  if (!basePrompt) throw new Error('模板提示词为空');

  return basePrompt;
}

/**
 * 从数据库模板中解析所有提示词（批量生成用）
 */
export async function resolveAllPromptsFromTemplate(
  templateId: string,
  maxCount?: number
): Promise<string[]> {
  const template = await getTemplateFromCacheOrDb(templateId);

  if (!template) throw new Error('模板不存在');
  if (!template.is_active) throw new Error('模板已停用');

  const promptList = Array.isArray(template.prompt_list)
    ? (template.prompt_list as string[]).filter(Boolean)
    : [];

  let prompts: string[];
  if (promptList.length > 0) {
    prompts = promptList;
  } else {
    const config = (template.prompt_config && typeof template.prompt_config === 'object')
      ? template.prompt_config as Record<string, unknown>
      : {};
    const basePrompt = typeof config.basePrompt === 'string' ? config.basePrompt : '';
    prompts = basePrompt ? [basePrompt] : [];
  }

  if (prompts.length === 0) throw new Error('模板提示词为空');
  return maxCount ? prompts.slice(0, maxCount) : prompts;
}

const FACE_PRESERVATION_LEVELS: Record<'high' | 'medium' | 'low', string> = {
  high: FACE_PRESERVATION,
  medium:
    'REQUIREMENTS:\n' +
    '1. Preserve the main facial features and facial contours from the original image\n' +
    "2. Maintain the person's basic facial structure and proportions\n" +
    '3. Ensure the person in the edited image is recognizable as the same individual\n' +
    '4. Allow minor facial detail adjustments but do not change overall characteristics\n' +
    '5. Prioritize facial preservation over stylistic changes',
  low:
    'BASIC REQUIREMENTS:\n' +
    '1. Try to preserve the main facial features from the original image\n' +
    '2. Maintain the basic facial contours of the person\n' +
    '3. Allow some degree of facial adjustment and stylization while keeping general likeness',
};

export type FacePreservationLevel = 'high' | 'medium' | 'low';
export type CreativityLevel = 'conservative' | 'balanced' | 'creative';

/**
 * 根据 face preservation 级别增强提示词（服务端专用，从前端迁移）
 */
export function enhancePromptWithSettings(
  prompt: string,
  facePreservation: FacePreservationLevel = 'high',
): string {
  if (facePreservation === 'low') return prompt;

  const faceText = FACE_PRESERVATION_LEVELS[facePreservation];
  return [
    'Please edit the provided original image based on the following guidelines:',
    '',
    faceText,
    '',
    `SPECIFIC EDITING REQUEST: ${prompt}`,
    '',
    "Please focus your modifications ONLY on the user's specific requirements while strictly following the face preservation guidelines above. Generate a high-quality edited image that maintains facial identity.",
  ].join('\n');
}

/**
 * 根据创意程度映射 temperature 和 top_p 参数
 */
export function mapCreativityToParams(level: CreativityLevel): { temperature: number; topP: number } {
  switch (level) {
    case 'balanced':
      return { temperature: 0.5, topP: 0.85 };
    case 'creative':
      return { temperature: 0.8, topP: 0.95 };
    default:
      return { temperature: 0.2, topP: 0.7 };
  }
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
