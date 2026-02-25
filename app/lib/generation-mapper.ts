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
  projectId: string | null;
  userId: string;
  templateId: string | null;
  domain: string;
  generationType: string | null;
  status: string;
  prompt: string | null;
  originalImage: string | null;
  settings: unknown;
  previewImages: unknown;
  highResImages: unknown;
  errorMessage: string | null;
  creditsUsed: number;
  isSharedToGallery: boolean;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  generatedImages?: PrismaGeneratedImageRow[];
  project?: { name: string; uploadedPhotos: unknown } | null;
  template?: { name: string } | null;
}

interface PrismaGeneratedImageRow {
  id: string;
  generationId: string;
  imageUrl: string;
  imageType: string;
  imageIndex: number;
  metadata: unknown;
  createdAt: Date;
}

/**
 * 将 Prisma GeneratedImage 行映射为 API 类型
 */
function mapGeneratedImage(img: PrismaGeneratedImageRow): GeneratedImage {
  return {
    id: img.id,
    generation_id: img.generationId,
    image_url: img.imageUrl,
    image_type: img.imageType as 'preview' | 'high_res',
    image_index: img.imageIndex,
    metadata: img.metadata as GeneratedImage['metadata'],
    created_at: img.createdAt.toISOString(),
  };
}

/**
 * 将 Prisma Generation 行映射为 API Generation 类型
 */
export function mapGeneration(g: PrismaGenerationRow): Generation {
  const genType = (g.generationType || 'batch') as 'batch' | 'single';
  const base = {
    id: g.id,
    user_id: g.userId,
    domain: g.domain,
    status: g.status as Generation['status'],
    preview_images: Array.isArray(g.previewImages) ? g.previewImages as string[] : [],
    high_res_images: Array.isArray(g.highResImages) ? g.highResImages as string[] : [],
    generated_images: g.generatedImages?.map(mapGeneratedImage) ?? [],
    error_message: g.errorMessage || undefined,
    credits_used: g.creditsUsed,
    is_shared_to_gallery: g.isSharedToGallery,
    created_at: g.createdAt.toISOString(),
    completed_at: g.completedAt?.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  };

  if (genType === 'single') {
    return {
      ...base,
      generation_type: 'single' as const,
      project_id: null,
      template_id: g.templateId,
      prompt: g.prompt || '',
      original_image: g.originalImage || '',
      settings: g.settings as SingleGenerationRecord['settings'],
    };
  }

  return {
    ...base,
    generation_type: 'batch' as const,
    project_id: g.projectId || '',
    template_id: g.templateId || '',
    prompt: null,
    original_image: null,
    settings: null,
  };
}

/**
 * 将 Prisma Generation 行映射为 GenerationWithRelations 类型
 */
export function mapGenerationWithRelations(g: PrismaGenerationRow): GenerationWithRelations {
  const genType = (g.generationType || 'batch') as 'batch' | 'single';

  return {
    id: g.id,
    generation_type: genType,
    status: g.status,
    preview_images: Array.isArray(g.previewImages) ? g.previewImages as string[] : [],
    high_res_images: Array.isArray(g.highResImages) ? g.highResImages as string[] : [],
    generated_images: g.generatedImages?.map(mapGeneratedImage) ?? [],
    error_message: g.errorMessage ?? undefined,
    is_shared_to_gallery: g.isSharedToGallery,
    completed_at: g.completedAt?.toISOString(),
    project: g.project ? {
      name: g.project.name,
      uploaded_photos: Array.isArray(g.project.uploadedPhotos)
        ? g.project.uploadedPhotos as string[]
        : undefined,
    } : null,
    template: g.template ? { name: g.template.name } : null,
    prompt: g.prompt,
    original_image: g.originalImage,
    settings: g.settings as GenerationWithRelations['settings'],
  };
}
