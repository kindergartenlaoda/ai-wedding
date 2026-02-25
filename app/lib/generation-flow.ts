/**
 * Generation Flow Service
 *
 * 封装完整的图片生成流程，从积分冻结到最终结果保存。
 * 组件层只需要调用 startGeneration() 并监听进度回调。
 */

import type { Template } from '@/types/database';
import type { GenerationDomain } from '@/types/domain';
import type { ValidatedPhoto } from '@/types/step-flow';
import { parseImageFromContent } from '@/lib/image-stream';

// ==================== Types ====================

export interface GenerationFlowParams {
  domain: GenerationDomain;
  template: Template;
  photos: ValidatedPhoto[];
  imageCount?: number;  // 用户选择的生成数量，默认为全部
}

export interface GenerationFlowResult {
  images: string[];
  generationId: string;
}

export interface GenerationFlowProgress {
  stage: 'freezing' | 'creating_project' | 'creating_generation' | 'generating' | 'uploading' | 'finalizing';
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: GenerationFlowProgress) => void;

export class GenerationFlowError extends Error {
  constructor(
    message: string,
    public readonly stage: GenerationFlowProgress['stage'],
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'GenerationFlowError';
  }
}

// ==================== Constants ====================

const PROGRESS_MESSAGES = {
  freezing: '正在预留积分...',
  creating_project: '正在创建项目...',
  creating_generation: '正在准备生成...',
  generating: '正在雕琢光影...',
  uploading: '正在保存作品...',
  finalizing: '正在完成...',
} as const;

const GENERATION_STAGES = [
  '正在雕琢光影...',
  'AI 解析面部特征中...',
  '构筑视觉叙事...',
  '渲染最终画面...',
] as const;

// ==================== Core Logic ====================

/**
 * 冻结积分
 */
async function freezeCredits(amount: number): Promise<void> {
  const res = await fetch('/api/credits/freeze', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '积分冻结失败' }));
    throw new Error(data.error || '积分不足，无法开始生成');
  }
}

/**
 * 解冻积分（失败回滚）
 */
async function unfreezeCredits(amount: number): Promise<void> {
  try {
    await fetch('/api/credits/unfreeze', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
  } catch (err) {
    console.error('解冻积分失败:', err);
  }
}

/**
 * 创建项目
 */
async function createProject(
  domain: GenerationDomain,
  templateName: string,
  photoUrls: string[]
): Promise<string> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${templateName} - ${new Date().toLocaleDateString('zh-CN')}`,
      domain,
      uploaded_photos: photoUrls,
    }),
  });

  if (!res.ok) {
    throw new Error('创建项目失败');
  }

  const data = await res.json();
  return data.id;
}

/**
 * 创建生成记录
 */
async function createGeneration(
  projectId: string,
  templateId: string,
  domain: GenerationDomain,
  creditsUsed: number
): Promise<string> {
  const res = await fetch('/api/generations', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      template_id: templateId,
      domain,
      credits_used: creditsUsed,
    }),
  });

  if (!res.ok) {
    throw new Error('创建生成记录失败');
  }

  const data = await res.json();
  return data.id;
}

/**
 * 流式生成单张图片
 */
async function generateSingleImage(
  prompt: string,
  photoUrls: string[]
): Promise<string | null> {
  const res = await fetch('/api/generate-stream', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_inputs: photoUrls,
    }),
  });

  if (!res.ok || !res.body) {
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      if (sseBuffer.trim().length > 0) {
        sseBuffer += '\n\n';
      }
    } else {
      sseBuffer += decoder.decode(value, { stream: true });
    }

    const events = sseBuffer.split(/\n\n/);
    sseBuffer = events.pop() || '';

    for (const evt of events) {
      const dataLines = evt
        .split(/\n/)
        .filter((l: string) => l.startsWith('data:'))
        .map((l: string) => l.slice(5).trimStart());

      if (dataLines.length === 0) continue;

      const dataPayload = dataLines.join('\n').trim();
      if (dataPayload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataPayload) as {
          choices?: Array<{
            delta?: { content?: string };
            finish_reason?: string | null;
          }>;
        };

        if (parsed.choices?.[0]?.delta?.content) {
          content += parsed.choices[0].delta.content;
        }
      } catch {
        // skip unparseable
      }
    }

    if (done) break;
  }

  const { imageData, imageUrl } = parseImageFromContent(content);

  if (imageData) {
    return imageData.dataUrl;
  } else if (imageUrl) {
    return imageUrl;
  }

  return null;
}

/**
 * 上传图片到 MinIO
 */
async function uploadImage(
  imageDataUrl: string,
  generationId: string
): Promise<string> {
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        folder: `generations/${generationId}/previews`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.presignedUrl || data.url || imageDataUrl;
    }
  } catch {
    // fallback to dataUrl
  }

  return imageDataUrl;
}

/**
 * 更新生成记录状态
 */
async function updateGenerationStatus(
  generationId: string,
  status: 'completed' | 'failed',
  images?: string[]
): Promise<void> {
  await fetch(`/api/generations/${generationId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      preview_images: images,
    }),
  });
}

/**
 * 扣除积分
 */
async function deductCredits(amount: number): Promise<void> {
  await fetch('/api/credits/deduct', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
}

// ==================== Main Flow ====================

/**
 * 执行完整的图片生成流程
 *
 * @throws {GenerationFlowError} 如果任何步骤失败
 */
export async function startGeneration(
  params: GenerationFlowParams,
  onProgress?: ProgressCallback
): Promise<GenerationFlowResult> {
  const { domain, template, photos, imageCount } = params;
  const photoUrls = photos.map(p => p.minioUrl).filter(Boolean);

  // 根据用户选择的数量截取 prompts
  const allPrompts = template.prompt_list?.length
    ? template.prompt_list
    : [template.prompt_config.basePrompt];

  const prompts = imageCount
    ? allPrompts.slice(0, imageCount)
    : allPrompts;

  let projectId: string | null = null;
  let generationId: string | null = null;
  let progressInterval: NodeJS.Timeout | null = null;

  const reportProgress = (
    stage: GenerationFlowProgress['stage'],
    progress: number
  ) => {
    onProgress?.({
      stage,
      progress,
      message: PROGRESS_MESSAGES[stage],
    });
  };

  try {
    // Step 1: 冻结积分
    reportProgress('freezing', 5);
    await freezeCredits(template.price_credits);

    // Step 2: 创建项目
    reportProgress('creating_project', 10);
    projectId = await createProject(domain, template.name, photoUrls);

    // Step 3: 创建生成记录
    reportProgress('creating_generation', 15);
    generationId = await createGeneration(
      projectId,
      template.id,
      domain,
      template.price_credits
    );

    // Step 4: 生成图片（循环处理多个 prompt）
    reportProgress('generating', 20);

    // 启动进度模拟（20% → 80%）
    let currentProgress = 20;
    let stageIndex = 0;
    progressInterval = setInterval(() => {
      if (currentProgress < 80) {
        currentProgress = Math.min(currentProgress + 5, 80);
        stageIndex = Math.min(
          Math.floor((currentProgress - 20) / 15),
          GENERATION_STAGES.length - 1
        );
        onProgress?.({
          stage: 'generating',
          progress: currentProgress,
          message: GENERATION_STAGES[stageIndex],
        });
      }
    }, 3000);

    const allImages: string[] = [];

    for (const prompt of prompts) {
      const imageDataUrl = await generateSingleImage(prompt, photoUrls);

      if (imageDataUrl) {
        allImages.push(imageDataUrl);
      }
    }

    // 清除进度模拟
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (allImages.length === 0) {
      throw new GenerationFlowError(
        '未能生成任何图片',
        'generating'
      );
    }

    // Step 5: 上传图片到 MinIO
    reportProgress('uploading', 85);
    const uploadedImages: string[] = [];

    for (const imageDataUrl of allImages) {
      const uploadedUrl = await uploadImage(imageDataUrl, generationId);
      uploadedImages.push(uploadedUrl);
    }

    // Step 6: 更新生成记录
    reportProgress('finalizing', 90);
    await updateGenerationStatus(generationId, 'completed', uploadedImages);

    // Step 7: 扣除积分
    await deductCredits(template.price_credits);

    reportProgress('finalizing', 100);

    return {
      images: uploadedImages,
      generationId,
    };

  } catch (err) {
    // 清理进度定时器
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    // 回滚积分
    await unfreezeCredits(template.price_credits);

    // 更新生成记录为失败状态
    if (generationId) {
      await updateGenerationStatus(generationId, 'failed').catch(() => {
        // ignore update failure
      });
    }

    // 重新抛出错误
    if (err instanceof GenerationFlowError) {
      throw err;
    }

    const message = err instanceof Error ? err.message : '生成失败';
    throw new GenerationFlowError(message, 'generating', err);
  }
}
