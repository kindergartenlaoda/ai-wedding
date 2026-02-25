/**
 * Prisma Generation 模型到 API 类型的映射工具
 *
 * 消除 generations/route.ts 和 generations/[id]/route.ts 中的重复映射代码。
 */

import type { Generation, GeneratedImage, GenerationWithRelations, SingleGenerationRecord } from '@/types/database';

/**
 * Prisma Generation 查询结果的类型（含关联）
 */
interface PrismaGenerationRow {
  id: string;
  project_id: string | null;
  user_id: string;
  template_id: string | null;
  domain: string;
  generation_type: string | null;
  status: string;
  prompt: string | null;
  original_image: string | null;
  settings: unknown;
  preview_images: unknown;
  high_res_images: unknown;
  error_message: string | null;
  credits_used: number;
  is_shared_to_gallery: boolean;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
  generated_images?: PrismaGeneratedImageRow[];
  projects?: { name: string; uploaded_photos: unknown } | null;
  templates?: { name: string } | null;
}

interface PrismaGeneratedImageRow {
  id: string;
  generation_id: string;
  image_url: string;
  image_type: string;
  image_index: number;
  metadata: unknown;
  created_at: Date;
}

/**
 * 将 Prisma GeneratedImage 行映射为 API 类型
 */
function mapGeneratedImage(img: PrismaGeneratedImageRow): GeneratedImage {
  return {
    id: img.id,
    generation_id: img.generation_id,
    image_url: img.image_url,
    image_type: img.image_type as 'preview' | 'high_res',
    image_index: img.image_index,
    metadata: img.metadata as GeneratedImage['metadata'],
    created_at: img.created_at.toISOString(),
  };
}

/**
 * 将 Prisma Generation 行映射为 API Generation 类型
 */
export function mapGeneration(g: PrismaGenerationRow): Generation {
  const genType = (g.generation_type || 'batch') as 'batch' | 'single';
  const base = {
    id: g.id,
    user_id: g.user_id,
    domain: g.domain,
    status: g.status as Generation['status'],
    preview_images: Array.isArray(g.preview_images) ? g.preview_images as string[] : [],
    high_res_images: Array.isArray(g.high_res_images) ? g.high_res_images as string[] : [],
    generated_images: g.generated_images?.map(mapGeneratedImage) ?? [],
    error_message: g.error_message || undefined,
    credits_used: g.credits_used,
    is_shared_to_gallery: g.is_shared_to_gallery,
    created_at: g.created_at.toISOString(),
    completed_at: g.completed_at?.toISOString(),
    updated_at: g.updated_at.toISOString(),
  };

  if (genType === 'single') {
    return {
      ...base,
      generation_type: 'single' as const,
      project_id: null,
      template_id: g.template_id,
      prompt: g.prompt || '',
      original_image: g.original_image || '',
      settings: g.settings as SingleGenerationRecord['settings'],
    };
  }

  return {
    ...base,
    generation_type: 'batch' as const,
    project_id: g.project_id || '',
    template_id: g.template_id || '',
    prompt: null,
    original_image: null,
    settings: null,
  };
}

/**
 * 将 Prisma Generation 行映射为 GenerationWithRelations 类型
 */
export function mapGenerationWithRelations(g: PrismaGenerationRow): GenerationWithRelations {
  const genType = (g.generation_type || 'batch') as 'batch' | 'single';

  return {
    id: g.id,
    generation_type: genType,
    status: g.status,
    preview_images: Array.isArray(g.preview_images) ? g.preview_images as string[] : [],
    high_res_images: Array.isArray(g.high_res_images) ? g.high_res_images as string[] : [],
    generated_images: g.generated_images?.map(mapGeneratedImage) ?? [],
    error_message: g.error_message ?? undefined,
    is_shared_to_gallery: g.is_shared_to_gallery,
    completed_at: g.completed_at?.toISOString(),
    project: g.projects ? {
      name: g.projects.name,
      uploaded_photos: Array.isArray(g.projects.uploaded_photos)
        ? g.projects.uploaded_photos as string[]
        : undefined,
    } : null,
    template: g.templates ? { name: g.templates.name } : null,
    prompt: g.prompt,
    original_image: g.original_image,
    settings: g.settings as GenerationWithRelations['settings'],
  };
}
