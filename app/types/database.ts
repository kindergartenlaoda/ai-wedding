/**
 * 统一的生成类型定义
 * 合并了原 Generation 和 SingleGeneration 的类型
 */

import type { ProjectStatus, GenerationStatus } from '@/types/status';

/**
 * 用户档案类型（统一定义，供 API 和 Context 使用）
 */
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  credits: number;
  frozen_credits: number;
  role: 'user' | 'admin';
  invite_code: string | null;
  invited_by: string | null;
  invite_count: number;
  reward_credits: number;
  created_at: string;
  updated_at: string;
}

/**
 * AI 生成提示词配置（仅服务端 + 管理端使用，前端不应依赖此类型）
 * @server-only
 */
export interface PromptConfig {
  basePrompt: string;
  styleModifiers?: string[];
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
  seed?: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  preview_image_url: string | null;
  /** 可用提示词数量（服务端计算，前端不接触原始 prompt） */
  prompt_count: number;
  /** 提示词的中文描述，供前端展示 */
  prompt_descriptions: string[];
  price_credits: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  /** 领域：wedding/children/id_photo 等，API 返回 */
  domain?: string;
}

/**
 * 管理端模板类型（包含完整 prompt 数据，仅管理端使用）
 */
export interface AdminTemplate extends Omit<Template, 'prompt_count' | 'prompt_descriptions'> {
  prompt_config: PromptConfig;
  prompt_list: string[];
  prompt_descriptions: string[];
  prompt_count: number;
}

/**
 * 前端生成参数：模板模式 vs 自定义模式
 */
export type GenerateParams =
  | { mode: 'template'; templateId: string; promptIndex: number; additionalPrompt?: string }
  | { mode: 'custom'; customPrompt: string };

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  uploaded_photos: string[];
  created_at: string;
  updated_at: string;
}

/**
 * 生成类型枚举
 */
export type GenerationType = 'batch' | 'single';

/**
 * 图片类型枚举
 */
export type ImageType = 'preview' | 'high_res';

/**
 * 独立的生成图片记录
 */
export interface GeneratedImage {
  id: string;
  generation_id: string;
  image_url: string;
  image_type: ImageType;
  image_index: number;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

/**
 * 生成记录基础字段
 */
interface GenerationBase {
  id: string;
  user_id: string;
  domain: string;
  status: GenerationStatus;

  // 已废弃字段（向后兼容，逐步移除）
  preview_images?: string[];
  high_res_images?: string[];

  // 新的图片关联
  generated_images?: GeneratedImage[];

  error_message?: string;
  credits_used: number;
  is_shared_to_gallery: boolean;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
}

/**
 * 批量生成记录 - 必须有 project_id 和 template_id
 */
export interface BatchGeneration extends GenerationBase {
  generation_type: 'batch';
  project_id: string;
  template_id: string;
  prompt?: null;
  original_image?: null;
  settings?: null;
}

/**
 * 单图生成记录 - 必须有 prompt 和 original_image
 */
export interface SingleGenerationRecord extends GenerationBase {
  generation_type: 'single';
  project_id?: null;
  template_id?: string | null;
  prompt: string;
  original_image: string;
  settings?: {
    facePreservation?: string;
    creativityLevel?: string;
    [key: string]: unknown;
  } | null;
}

/**
 * 统一的生成记录（判别联合类型）
 */
export type Generation = BatchGeneration | SingleGenerationRecord;

/**
 * 类型守卫：判断是否为批量生成
 */
export function isBatchGeneration(gen: Generation): gen is BatchGeneration {
  return gen.generation_type === 'batch';
}

/**
 * 类型守卫：判断是否为单图生成
 */
export function isSingleGeneration(gen: Generation): gen is SingleGenerationRecord {
  return gen.generation_type === 'single';
}

export interface Order {
  id: string;
  user_id: string;
  generation_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  payment_intent_id?: string;
  purchased_images: string[];
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  template_id: string;
  created_at: string;
}

// 复合类型：用于前端视图/Hook 的聚合结构

export interface ProjectWithTemplate {
  id: string;
  name: string;
  status: ProjectStatus | string;
  uploaded_photos: string[];
  created_at: string;
  updated_at: string;
  template?: {
    id: string;
    name: string;
    preview_image_url: string | null;
    domain?: string;
  };
  generation?: {
    id: string;
    status: GenerationStatus | string;
    preview_images?: string[];
    generated_images?: GeneratedImage[];
    completed_at: string;
    is_shared_to_gallery?: boolean;
  };
}

export interface GenerationWithRelations {
  id: string;
  generation_type: GenerationType;
  status: GenerationStatus | string;
  preview_images?: string[];
  high_res_images?: string[];
  generated_images?: GeneratedImage[];
  error_message?: string;
  is_shared_to_gallery?: boolean;
  completed_at?: string;
  project?: {
    name: string;
    uploaded_photos?: string[];
  } | null;
  template?: {
    name: string;
  } | null;
  // 单图生成字段
  prompt?: string | null;
  original_image?: string | null;
  settings?: Generation['settings'];
}

// 画廊展示项目的类型定义
export interface GalleryItem {
  id: string;
  generation_id: string;
  preview_images?: string[];
  generated_images?: GeneratedImage[];
  project_name?: string;
  template_name?: string;
  template_id?: string;
  domain?: string;
  user_name: string;
  created_at: string;
}

/**
 * @deprecated 使用 Generation（判别联合类型）替代
 * 保留用于向后兼容，将在下个版本移除
 */
export interface LegacySingleGeneration {
  id: string;
  user_id: string;
  prompt: string;
  original_image: string;
  result_image: string;
  settings: {
    facePreservation?: string;
    creativityLevel?: string;
  };
  credits_used: number;
  created_at: string;
}

/**
 * @deprecated 别名，使用 LegacySingleGeneration
 * 组件中仍在使用此名称，保留以避免破坏性变更
 */
export type SingleGeneration = LegacySingleGeneration;

// 系统公告类型定义
export interface SystemAnnouncement {
  id: string;
  content: string;
  is_active: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 辅助函数：将 Generation 转换为 LegacySingleGeneration 格式（向后兼容）
 */
export function generationToSingleGeneration(gen: Generation): LegacySingleGeneration | null {
  if (!isSingleGeneration(gen)) return null;

  const resultImage = gen.generated_images?.[0]?.image_url || gen.preview_images?.[0] || '';

  return {
    id: gen.id,
    user_id: gen.user_id,
    prompt: gen.prompt,
    original_image: gen.original_image,
    result_image: resultImage,
    settings: (gen.settings || {}) as LegacySingleGeneration['settings'],
    credits_used: gen.credits_used,
    created_at: gen.created_at,
  };
}

/**
 * 辅助函数：从 Generation 获取图片列表（兼容新旧格式）
 */
export function getGenerationImages(
  gen: Generation,
  type: ImageType = 'preview'
): string[] {
  // 优先使用新格式
  if (gen.generated_images && gen.generated_images.length > 0) {
    return gen.generated_images
      .filter(img => img.image_type === type)
      .sort((a, b) => a.image_index - b.image_index)
      .map(img => img.image_url);
  }

  // 回退到旧格式
  if (type === 'preview' && gen.preview_images) {
    return gen.preview_images;
  }
  if (type === 'high_res' && gen.high_res_images) {
    return gen.high_res_images;
  }

  return [];
}
