/**
 * 图片生成服务 - 分离游客模式和认证模式
 *
 * 设计原则：
 * 1. 游客模式：纯前端模拟，不写数据库
 * 2. 认证模式：调用封装的 API 路由
 * 3. 不在一个函数里用 if (!profile) 判断
 */

import { mockGenerateImages } from '@/lib/mock-generator';
import { parseImageFromContent } from '@/lib/image-stream';
import type { GenerationInput, GenerationProgress, GenerationResult } from '@/types/generation';
import type { Template } from '@/types/database';

function getPromptsFromTemplate(template: Template): string[] {
  const list = Array.isArray(template.prompt_list) ? template.prompt_list.filter(Boolean) : [];
  if (list.length > 0) return list;
  const base = template.prompt_config?.basePrompt?.trim();
  if (base) return [base];
  const fallback = (template.description || template.name || '').trim();
  return fallback ? [fallback] : ['beautiful wedding portrait'];
}

/**
 * 游客模式生成 - 本地模拟
 */
export async function generateAsGuest(
  input: GenerationInput,
  onProgress: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  onProgress({ stage: 'uploading', progress: 5 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  onProgress({ stage: 'analyzing', progress: 25 });

  const prompts = getPromptsFromTemplate(input.template);
  const images = await mockGenerateImages({
    input: input.photos[0],
    variants: Math.max(1, Math.min(8, prompts.length)),
  });

  onProgress({ stage: 'generating', progress: 80 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  onProgress({ stage: 'completed', progress: 100 });

  return { images, generationId: null };
}

/**
 * 认证用户生成 - 调用 API 路由
 */
export async function generateAsAuthenticated(
  input: GenerationInput,
  _userId: string,
  onProgress: (progress: GenerationProgress) => void
): Promise<GenerationResult> {
  onProgress({ stage: 'uploading', progress: 5 });

  const projectRes = await fetch('/api/projects', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.projectName,
      uploaded_photos: input.photos,
    }),
  });
  if (!projectRes.ok) {
    const err = await projectRes.json();
    throw new Error(err.error || '创建项目失败');
  }
  const projectData = await projectRes.json();

  const genRes = await fetch('/api/generations', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectData.id,
      template_id: input.template.id,
      credits_used: input.template.price_credits,
      is_shared_to_gallery: input.shareToGallery || false,
      domain: (input.template as { domain?: string }).domain ?? 'wedding',
    }),
  });
  if (!genRes.ok) {
    const err = await genRes.json();
    throw new Error(err.error || '创建生成记录失败');
  }
  const genData = await genRes.json();
  const generationId = genData.id;

  onProgress({ stage: 'analyzing', progress: 20 });

  const prompts = getPromptsFromTemplate(input.template);
  const total = Math.max(1, Math.min(8, prompts.length));
  const storedUrls: string[] = [];

  try {
    for (let i = 0; i < total; i++) {
      try {
        const variantPrompt = prompts[i] || (input.template.description || input.template.name || 'wedding');
        const rawPrompt = variantPrompt;

        const response = await fetch('/api/generate-stream', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: rawPrompt,
            image_inputs: input.photos.length > 0 ? [input.photos[0]] : undefined,
            model: 'gemini-2.5-flash-image',
          }),
        });

        if (!response.ok) {
          console.warn(`第 ${i + 1} 条提示词生成失败: ${response.statusText}`);
          continue;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          console.warn(`第 ${i + 1} 条提示词生成失败：无法获取响应流`);
          continue;
        }

        const decoder = new TextDecoder();
        let content = '';
        let sseBuffer = '';

        onProgress({ stage: 'generating', progress: 55 });

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (sseBuffer.trim().length > 0) sseBuffer += '\n\n';
          } else {
            sseBuffer += decoder.decode(value, { stream: true });
          }

          const events = sseBuffer.split(/\n\n/);
          sseBuffer = events.pop() || '';

          for (const evt of events) {
            const dataLines = evt
              .split(/\n/)
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart());
            if (dataLines.length === 0) continue;
            const dataPayload = dataLines.join('\n').trim();
            if (dataPayload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataPayload);
              if (parsed.choices?.[0]?.delta?.content) {
                content += parsed.choices[0].delta.content;
              }
              if (parsed.choices?.[0]?.finish_reason === 'stop') break;
            } catch {
              // ignore
            }
          }
          if (done) break;
        }

        onProgress({ stage: 'generating', progress: 70 });

        const { imageData, imageUrl: parsedUrl } = parseImageFromContent(content);

        let imageUrl = '';
        if (imageData) {
          imageUrl = imageData.dataUrl;
        } else if (parsedUrl) {
          imageUrl = parsedUrl;
        } else {
          console.warn(`第 ${i + 1} 条提示词：未在AI响应中找到图片，使用上传的照片作为占位`);
          imageUrl = input.photos[0];
        }

        onProgress({ stage: 'generating', progress: 80 });

        let storedUrl = imageUrl;
        // 远程 URL 直接使用，仅对 dataURL 进行上传
        if (imageUrl.startsWith('data:')) {
          try {
            const uploadRes = await fetch('/api/upload-image', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: imageUrl,
                folder: `generations/${generationId}/previews`,
              }),
            });
            if (uploadRes.ok) {
              const payload = await uploadRes.json();
              storedUrl = payload.presignedUrl || payload.url || imageUrl;
            } else {
              console.warn(`第 ${i + 1} 条提示词上传失败，使用 dataURL 回退:`, await uploadRes.text());
            }
          } catch (e) {
            console.warn(`第 ${i + 1} 条提示词调用上传接口异常，使用 dataURL 回退:`, e);
          }
        }

        storedUrls.push(storedUrl);
      } catch (e) {
        console.warn(`第 ${i + 1} 条提示词生成异常，已跳过:`, e);
      } finally {
        const ratio = Math.min(1, (i + 1) / total);
        const prog = 60 + Math.floor(ratio * 30);
        onProgress({ stage: 'generating', progress: prog });
      }
    }

    if (storedUrls.length === 0) {
      throw new Error('所有提示词均生成失败');
    }

    const updateRes = await fetch(`/api/generations/${generationId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        preview_images: storedUrls,
        completed_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      console.error('更新生成记录失败');
      throw new Error('保存生成结果失败');
    }

    onProgress({ stage: 'completed', progress: 100 });

    return { images: storedUrls, generationId };
  } catch (error) {
    // 生成失败，通过 API 退款积分
    try {
      await fetch('/api/credits/refund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: input.template.price_credits,
          generation_id: generationId,
          error_message: error instanceof Error ? error.message : '生成失败',
        }),
      });
    } catch (refundError) {
      console.error('退款失败:', refundError);
    }

    await markGenerationFailed(
      generationId,
      error instanceof Error ? error.message : '生成失败'
    );
    throw error;
  }
}

/**
 * 标记生成失败 - 回滚数据库状态
 */
export async function markGenerationFailed(generationId: string, error: string): Promise<void> {
  await fetch(`/api/generations/${generationId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'failed',
      error_message: error,
    }),
  });
}
