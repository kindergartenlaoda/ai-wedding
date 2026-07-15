/**
 * 图片生成 API 共享模块
 *
 * 提取自 generate-image、generate-stream、generate-single 三个 API route 的共同逻辑。
 * 消除重复代码，统一行为。
 */

import { prisma } from '@/lib/prisma';
import { resolveFallbackPrompt } from '@/lib/fallback-templates';
import { getActiveLocalModelConfig, isLocalModelConfigStoreEnabled } from '@/lib/local-model-config-store';
import type { ModelConfig } from '@/types/model-config';
import { ModelConfigType } from '../../generated/prisma/enums';
import type { Logger } from 'pino';
import sharp from 'sharp';

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

  if (isLocalModelConfigStoreEnabled()) {
    const localConfig = await getActiveLocalModelConfig(type, source);
    modelConfigCache.set(cacheKey, {
      value: localConfig,
      expiresAt: now + MODEL_CONFIG_CACHE_TTL_MS,
    });
    return localConfig;
  }

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
    if (isLocalModelConfigStoreEnabled()) {
      const localConfig = await getActiveLocalModelConfig(type, source);
      modelConfigCache.set(cacheKey, {
        value: localConfig,
        expiresAt: now + MODEL_CONFIG_CACHE_TTL_MS,
      });
      return localConfig;
    }
    return cached?.value ?? null;
  }
}

export function buildOpenAICompatibleEndpoint(apiBaseUrl: string, pathname: string): string {
  const baseUrl = apiBaseUrl.replace(/\/+$/, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const pathWithoutVersion = normalizedPath.startsWith('/v1/')
    ? normalizedPath.slice(3)
    : normalizedPath;

  if (/\/v1$/i.test(baseUrl)) {
    return `${baseUrl}${pathWithoutVersion}`;
  }

  return `${baseUrl}/v1${pathWithoutVersion}`;
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

    if (process.env.LOCAL_ADMIN_MODE === 'true' && isLoopbackHost(hostname)) {
      return false;
    }

    // 检查 localhost 和本地回环
    if (isLoopbackHost(hostname)) {
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

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname === '[::1]';
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
  let template;
  try {
    template = await getTemplateFromCacheOrDb(templateId);
  } catch (error) {
    const fallbackPrompt = resolveFallbackPrompt(templateId, promptIndex);
    if (fallbackPrompt) return fallbackPrompt;
    throw error;
  }

  if (!template) {
    const fallbackPrompt = resolveFallbackPrompt(templateId, promptIndex);
    if (fallbackPrompt) return fallbackPrompt;
    throw new Error('模板不存在');
  }
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

// ─── OpenAI Images API 适配 ───────────────────────────────────────────

export class ImageEndpointError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`Image endpoint request failed: ${status}`);
    this.name = 'ImageEndpointError';
    this.status = status;
    this.detail = detail;
  }
}

export interface OpenAIImageEndpointResult {
  dataUrl?: string;
  url?: string;
}

interface CallOpenAIImageEndpointParams {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  image_inputs?: string[];
  size?: string;
  quality?: 'auto' | 'low' | 'medium' | 'high';
  inputFidelity?: 'low' | 'high';
  n?: number;
  log?: Logger;
}

export function isOpenAIImageEndpointModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith('gpt-image-');
}

export async function callOpenAIImageEndpoint(
  params: CallOpenAIImageEndpointParams,
): Promise<OpenAIImageEndpointResult[]> {
  const {
    apiBaseUrl,
    apiKey,
    model,
    prompt,
    image_inputs,
    size = '1024x1024',
    quality = 'auto',
    inputFidelity,
    n = 1,
    log,
  } = params;

  const pickedImages = Array.isArray(image_inputs)
    ? image_inputs
        .filter((s) => typeof s === 'string' && (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://')))
        .slice(0, 5)
    : [];

  let endpoint: string;
  let response: Response;
  const started = Date.now();
  const canUseCompatibleFallback = size !== '1024x1024' || quality !== 'auto';
  const requestTimeoutMs = canUseCompatibleFallback
    ? Number(process.env.IMAGE_NATIVE_HD_TIMEOUT_MS || '60000')
    : Number(process.env.IMAGE_API_REQUEST_TIMEOUT_MS || '180000');

  const runCompatibleFallback = async (reason: unknown): Promise<OpenAIImageEndpointResult[]> => {
    log?.warn({
      reason: reason instanceof Error ? reason.message : String(reason),
      requestedSize: size,
      requestedQuality: quality,
    }, 'Native high-resolution request failed; using compatible fallback');
    const fallbackResults = await callOpenAIImageEndpoint({
      ...params,
      size: '1024x1024',
      quality: 'auto',
      // Some compatible gateways accept only one edit image. The native
      // request still tries all references first for better identity fidelity.
      image_inputs: pickedImages.length > 1 ? [pickedImages[0]] : params.image_inputs,
    });
    return upscaleImageEndpointResults(fallbackResults, 2048, log);
  };

  const preferEventStream = shouldRequestImageEventStream(apiBaseUrl, model);

  try {
  if (pickedImages.length > 0) {
    endpoint = buildOpenAICompatibleEndpoint(apiBaseUrl, '/images/edits');
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('n', String(Math.max(1, Math.min(8, n))));
    form.append('size', size);
    if (quality !== 'auto') {
      form.append('quality', quality);
    }
    if (inputFidelity) {
      form.append('input_fidelity', inputFidelity);
    }
    form.append('response_format', 'b64_json');
    if (preferEventStream) {
      form.append('stream', 'true');
      form.append('partial_images', '1');
    }

    // OpenAI's Images Edits API uses image[] for multiple references. Keeping
    // one image as image preserves compatibility with simpler gateways.
    for (const [index, pickedImage] of pickedImages.entries()) {
      const imageDataUrl = await convertUrlToBase64(pickedImage);
      const { mimeType, bytes, extension } = await parseImageDataUrl(imageDataUrl, log);
      const fieldName = pickedImages.length > 1 ? 'image[]' : 'image';
      form.append(fieldName, new Blob([bytes], { type: mimeType }), `input-${index}.${extension}`);
    }

    log?.info({
      endpoint,
      model,
      size,
      hasImage: true,
      referenceCount: pickedImages.length,
      inputFidelity,
      preferEventStream,
    }, '调用 OpenAI Images edits API');
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(preferEventStream ? { Accept: 'text/event-stream' } : {}),
      },
      body: form,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } else {
    endpoint = buildOpenAICompatibleEndpoint(apiBaseUrl, '/images/generations');
    const payload = {
      model,
      prompt,
      n: Math.max(1, Math.min(8, n)),
      size,
      response_format: 'b64_json' as const,
      ...(quality !== 'auto' ? { quality } : {}),
      ...(preferEventStream ? { stream: true, partial_images: 1 } : {}),
    };

    log?.info({ endpoint, model, size, hasImage: false, preferEventStream }, '调用 OpenAI Images generations API');
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(preferEventStream ? { Accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  }
  } catch (error) {
    if (canUseCompatibleFallback) {
      return runCompatibleFallback(error);
    }
    throw error;
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  log?.info({ status: response.status, contentType, duration: `${Date.now() - started}ms` }, '收到 OpenAI Images API 响应');

  let data: Record<string, unknown> | null = null;
  try {
    data = text ? JSON.parse(text) as Record<string, unknown> : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 400 && inputFidelity) {
      log?.warn({ endpoint, inputFidelity }, '上游不兼容 input_fidelity，移除后重试');
      return callOpenAIImageEndpoint({ ...params, inputFidelity: undefined });
    }
    if (pickedImages.length > 1 && response.status === 400) {
      log?.warn({ endpoint }, '多参考图请求不被上游兼容，退回单参考图');
      return callOpenAIImageEndpoint({ ...params, image_inputs: [pickedImages[0]] });
    }
    if (canUseCompatibleFallback && (
      response.status === 400
      || response.status === 408
      || response.status === 429
      || response.status >= 500
    )) {
      return runCompatibleFallback(new ImageEndpointError(response.status, text || response.statusText));
    }
    throw new ImageEndpointError(response.status, text || response.statusText);
  }

  if (!data) {
    const eventImages = parseImageEventStream(text, log);
    if (eventImages.length > 0) return eventImages;
    throw new ImageEndpointError(
      502,
      describeInvalidImageEndpointResponse(endpoint, contentType, text),
    );
  }

  const outputFormat = typeof data.output_format === 'string' ? data.output_format : 'png';
  const mimeType = outputFormat.includes('/') ? outputFormat : `image/${outputFormat}`;
  const items = Array.isArray(data?.data) ? data.data as Array<{ b64_json?: string; url?: string }> : [];
  const results = items.reduce<OpenAIImageEndpointResult[]>((acc, item) => {
    if (typeof item.b64_json === 'string' && item.b64_json.length > 0) {
      acc.push({ dataUrl: `data:${mimeType};base64,${item.b64_json}` });
    } else if (typeof item.url === 'string' && item.url.length > 0) {
      acc.push({ url: item.url });
    }
    return acc;
  }, []);

  if (results.length === 0) {
    throw new ImageEndpointError(502, describeInvalidImageEndpointResponse(endpoint, contentType, text));
  }

  return results;
}

async function upscaleImageEndpointResults(
  results: OpenAIImageEndpointResult[],
  targetLongEdge: number,
  log?: Logger,
): Promise<OpenAIImageEndpointResult[]> {
  return Promise.all(results.map(async (result) => {
    try {
      const dataUrl = result.dataUrl || (result.url ? await convertUrlToBase64(result.url) : null);
      if (!dataUrl) return result;
      const match = dataUrl.match(/^data:[^;]+;base64,([\s\S]+)$/);
      if (!match) return result;

      const input = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
      const image = sharp(input, { failOn: 'none' }).rotate();
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const currentLongEdge = Math.max(width, height);
      if (!width || !height || currentLongEdge >= targetLongEdge) return result;

      const scale = targetLongEdge / currentLongEdge;
      const outputWidth = Math.max(1, Math.round(width * scale));
      const outputHeight = Math.max(1, Math.round(height * scale));
      const output = await image
        .resize(outputWidth, outputHeight, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .sharpen(1)
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer();

      log?.info({
        inputWidth: width,
        inputHeight: height,
        outputWidth,
        outputHeight,
        outputKb: Math.round(output.length / 1024),
      }, 'Generated 2K upscaled image');

      return { dataUrl: `data:image/jpeg;base64,${output.toString('base64')}` };
    } catch (error) {
      log?.warn({ error: error instanceof Error ? error.message : String(error) }, '2K upscale failed; preserving original image');
      return result;
    }
  }));
}

function shouldRequestImageEventStream(apiBaseUrl: string, model: string): boolean {
  if (process.env.IMAGE_API_STREAM_IMAGES === 'true') return true;
  if (process.env.IMAGE_API_STREAM_IMAGES === 'false') return false;
  try {
    const host = new URL(apiBaseUrl).hostname.toLowerCase();
    return isOpenAIImageEndpointModel(model) && isLoopbackHost(host);
  } catch {
    return false;
  }
}

function parseImageEventStream(text: string, log?: Logger): OpenAIImageEndpointResult[] {
  const results: OpenAIImageEndpointResult[] = [];
  const events = text.split(/\n\n+/);

  for (const event of events) {
    const dataLines = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]');

    for (const line of dataLines) {
      try {
        const payload = JSON.parse(line) as Record<string, unknown>;
        const outputFormat = typeof payload.output_format === 'string' ? payload.output_format : 'png';
        const mimeType = outputFormat.includes('/') ? outputFormat : `image/${outputFormat}`;
        const b64 = typeof payload.b64_json === 'string'
          ? payload.b64_json
          : typeof payload.result === 'string'
            ? payload.result
            : '';
        const eventType = typeof payload.type === 'string' ? payload.type : '';

        if (b64 && (eventType.includes('completed') || !results.some((item) => item.dataUrl === `data:${mimeType};base64,${b64}`))) {
          results.push({ dataUrl: `data:${mimeType};base64,${b64}` });
        }
      } catch {
        // Ignore non-JSON SSE data lines.
      }
    }
  }

  if (results.length > 0) {
    log?.info({ count: results.length }, '已解析 OpenAI Images SSE 图像结果');
  }
  return results;
}
function describeInvalidImageEndpointResponse(endpoint: string, contentType: string, text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  const preview = compact.slice(0, 240);
  if (/^<!doctype html|<html[\s>]/i.test(compact)) {
    return `Upstream ${endpoint} returned an HTML page instead of an OpenAI Images JSON response. This usually means the gateway does not expose /v1/images/* or routed the request to its web UI.`;
  }
  return `Upstream ${endpoint} did not return image data. content-type=${contentType || 'unknown'} body=${preview || 'empty'}`;
}

export function buildOpenAIImageEndpointStream(
  images: OpenAIImageEndpointResult[],
  log?: Logger,
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      try {
        for (const image of images) {
          const imageRef = image.dataUrl || image.url;
          if (!imageRef) continue;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `![image](${imageRef})` } }] })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        log?.info({ count: images.length }, 'OpenAI Images API 响应已转换为 SSE');
      } catch (error) {
        log?.error({ error }, 'OpenAI Images API SSE 转换失败');
        controller.error(error);
      }
    },
  });
}

async function parseImageDataUrl(
  dataUrl: string,
  log?: Logger,
): Promise<{ mimeType: string; bytes: ArrayBuffer; extension: string }> {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    throw new Error('Invalid image data URL');
  }

  let mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  let output = new Uint8Array(buffer);

  try {
    output = new Uint8Array(await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer());
    mimeType = 'image/png';
    log?.info({ inputKb: Math.round(buffer.length / 1024), outputKb: Math.round(output.length / 1024) }, '已压缩 OpenAI Images edits 输入图');
  } catch (error) {
    log?.warn({ error: error instanceof Error ? error.message : 'Unknown' }, '输入图压缩失败，使用原图');
  }

  const bytes = new ArrayBuffer(output.byteLength);
  new Uint8Array(bytes).set(output);
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '') || 'png';

  return {
    mimeType,
    bytes,
    extension,
  };
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
