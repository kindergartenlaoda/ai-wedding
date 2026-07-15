import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ImageGenerationSettings, GenerationState } from '@/components/GenerateSinglePage/types';
import type { ModelConfigSource } from '@/types/model-config';
import type { GenerateParams } from '@/types/database';

interface UseStreamImageGenerationProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `API请求失败: ${response.status} ${response.statusText}`;
  const text = await response.text().catch(() => '');
  if (!text) return fallback;

  try {
    const data = JSON.parse(text) as { error?: unknown; message?: unknown };
    const value = data.error ?? data.message;
    if (typeof value === 'string' && value.trim()) return value;
    if (value && typeof value === 'object' && 'message' in value) {
      const nested = (value as { message?: unknown }).message;
      if (typeof nested === 'string' && nested.trim()) return nested;
    }
  } catch {
    // Fall through to the raw response preview.
  }

  return `${fallback}: ${text.slice(0, 300)}`;
}
export function useStreamImageGeneration({ onError, onSuccess }: UseStreamImageGenerationProps) {
  const { user } = useAuth();
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    generatedImage: null,
    streamingContent: '',
  });

  const persistGeneratedImage = async (
    generatedImage: string,
    originalImage: string,
    params: GenerateParams,
    settings: ImageGenerationSettings
  ): Promise<void> => {
    try {
      if (!user?.id) {
        console.warn('用户未登录，跳过保存生成历史');
        return;
      }

      const uploadIfNeeded = async (image: string, folder: string): Promise<string> => {
        if (!image.startsWith('data:')) return image;
        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image, folder }),
          });
          if (!response.ok) return image;
          const result = await response.json() as { presignedUrl?: string; url?: string };
          return result.presignedUrl || result.url || image;
        } catch {
          return image;
        }
      };

      const [resultImageUrl, originalImageUrl] = await Promise.all([
        uploadIfNeeded(generatedImage, 'generate-single/results'),
        uploadIfNeeded(originalImage, 'generate-single/uploads'),
      ]);

      const promptForSave = params.mode === 'template'
        ? `[template:${params.templateId}:${params.promptIndex}]${params.additionalPrompt ? ` ${params.additionalPrompt}` : ''}`
        : params.customPrompt;

      const createResponse = await fetch('/api/generations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generation_type: 'single',
          template_id: params.mode === 'template' ? params.templateId : undefined,
          prompt: promptForSave,
          original_image: originalImageUrl,
          settings,
          credits_used: 15,
          domain: 'wedding',
        }),
      });

      if (!createResponse.ok) {
        throw new Error(await readErrorMessage(createResponse));
      }

      const generation = await createResponse.json() as { id: string };
      const completeResponse = await fetch(`/api/generations/${generation.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
          preview_images: [resultImageUrl],
          high_res_images: [resultImageUrl],
        }),
      });

      if (!completeResponse.ok) {
        throw new Error(await readErrorMessage(completeResponse));
      }

      onSuccess('图片生成完成并已保存到历史！');
    } catch (error) {
      console.warn('保存生成历史失败（不影响本次结果）:', error);
    }
  };

  const generateImage = async (
    originalImage: string,
    params: GenerateParams,
    settings: ImageGenerationSettings,
    source?: ModelConfigSource
  ): Promise<void> => {
    onError('');
    onSuccess('');
    setGenerationState({
      isGenerating: true,
      generatedImage: null,
      streamingContent: '',
    });

    try {
      const requestBody = params.mode === 'template'
        ? {
            mode: 'template' as const,
            template_id: params.templateId,
            prompt_index: params.promptIndex,
            additional_prompt: params.additionalPrompt,
            image_inputs: [originalImage],
            source,
            face_preservation: settings.facePreservation,
            creativity_level: settings.creativityLevel,
            image_quality: settings.imageQuality,
            image_size: settings.imageSize,
          }
        : {
            mode: 'custom' as const,
            custom_prompt: params.customPrompt,
            image_inputs: [originalImage],
            source,
            face_preservation: settings.facePreservation,
            creativity_level: settings.creativityLevel,
            image_quality: settings.imageQuality,
            image_size: settings.imageSize,
          };

      const response = await fetch('/api/generate-single', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let content = '';
      let sseBuffer = '';
      let processingCount = 0;

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
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trimStart());

          if (dataLines.length === 0) continue;

          const dataPayload = dataLines.join('\n').trim();

          if (dataPayload === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(dataPayload);

            // 检查是否有错误
            if (parsed.error) {
              console.error('API返回错误:', parsed.error);
              const errorMsg = parsed.error.message || '未知错误';
              throw new Error(`API错误: ${errorMsg}`);
            }

            // 处理流式增量内容（delta）
            if (parsed.choices?.[0]?.delta) {
              const delta = parsed.choices[0].delta;

              // 1. 检查是否有图片数据（images数组）- OpenRouter 特有
              if (delta.images && Array.isArray(delta.images) && delta.images.length > 0) {
                console.log('检测到Delta中的images数组，长度:', delta.images.length);
                for (const img of delta.images) {
                  if (img.image_url?.url) {
                    console.log('找到图片URL，长度:', img.image_url.url.length);
                    content = img.image_url.url;
                    break;
                  }
                }
              }
              // 2. 处理文本内容
              else if (delta.content) {
                const deltaContent = delta.content;

                // 过滤掉 OPENROUTER PROCESSING 标记
                if (typeof deltaContent === 'string' && deltaContent.includes('OPENROUTER PROCESSING')) {
                  processingCount++;
                  console.log(`跳过 PROCESSING 标记 (${processingCount})`);
                  continue;
                }

                // 处理字符串类型的delta
                if (typeof deltaContent === 'string') {
                  content += deltaContent;
                  // 实时更新流式内容（不过滤 PROCESSING）
                  const cleanContent = content.replace(/:\s*OPENROUTER\s+PROCESSING\s*/gi, '').trim();
                  setGenerationState(prev => ({
                    ...prev,
                    streamingContent: cleanContent,
                  }));
                }
              }
            }

            // 处理完整的消息内容（message.content）- 通常在最后一个chunk
            if (parsed.choices?.[0]?.message?.content) {
              console.log('检测到完整消息内容');
              const messageContent = parsed.choices[0].message.content;

              // 如果是数组格式（包含图片数据）
              if (Array.isArray(messageContent)) {
                for (const item of messageContent) {
                  if (item.type === 'image' && item.source?.data) {
                    console.log('在Message中检测到图片数据，长度:', item.source.data.length);
                    // 保存为 JSON 字符串，后续解析
                    content = JSON.stringify({ content: messageContent });
                    break;
                  }
                }
              } else if (typeof messageContent === 'string') {
                content += messageContent;
              }
            }
          } catch (e) {
            console.warn('解析流式数据失败:', e);
          }
        }

        if (done) break;
      }

      // 清理最终内容（移除所有 PROCESSING 标记）
      const finalContent = content.replace(/:\s*OPENROUTER\s+PROCESSING\s*/gi, '').trim();
      console.log('流式接收完成，内容长度:', finalContent.length);
      console.log('PROCESSING标记出现次数:', processingCount);

      if (finalContent) {
        let imageDataUrl: string | null = null;

        // 1. 检查是否直接是 data URL 格式
        if (finalContent.startsWith('data:image/')) {
          const match = finalContent.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (match) {
            const base64String = match[2];
            if (base64String.length >= 100) {
              imageDataUrl = finalContent;
              console.log('提取到直接的data URL格式图片');
            }
          }
        }

        // 2. 尝试解析 JSON 格式（数组格式的 content）
        if (!imageDataUrl) {
          try {
            const jsonData = JSON.parse(finalContent);
            if (jsonData.content && Array.isArray(jsonData.content)) {
              for (const item of jsonData.content) {
                if (item.type === 'image' && item.source?.data) {
                  const imageType = item.source.media_type?.split('/')[1] || 'png';
                  const base64String = item.source.data;
                  if (base64String.length >= 100) {
                    imageDataUrl = `data:${item.source.media_type || 'image/png'};base64,${base64String}`;
                    console.log('提取到JSON格式图片，类型:', imageType);
                    break;
                  }
                }
            }
          }
          } catch {
            // 不是JSON格式，继续尝试Markdown格式
          }
        }

        // 3. 尝试 Markdown 格式（base64）
        if (!imageDataUrl) {
          const base64ImageMatch = finalContent.match(
            /!\[image\]\(data:\s*image\/([^;]+);\s*base64,\s*([^)]+)\)/i
          );
          if (base64ImageMatch) {
            const imageType = base64ImageMatch[1];
            const base64String = base64ImageMatch[2].replace(/\s+/g, '');
            if (base64String.length >= 100) {
              imageDataUrl = `data:image/${imageType};base64,${base64String}`;
              console.log('提取到Markdown格式图片，类型:', imageType);
            }
          }
        }

        // 4. 尝试 Markdown 格式（URL）- 302.ai 返回格式
        if (!imageDataUrl) {
          const urlImageMatch = finalContent.match(
            /!\[image\]\((https?:\/\/[^)]+)\)/i
          );
          if (urlImageMatch) {
            imageDataUrl = urlImageMatch[1];
            console.log('提取到 URL 格式图片:', imageDataUrl);
          }
        }

        if (imageDataUrl) {
          setGenerationState(prev => ({
            ...prev,
            generatedImage: imageDataUrl,
            isGenerating: false,
          }));
          onSuccess('图片生成完成！');

          await persistGeneratedImage(imageDataUrl, originalImage, params, settings);
        } else {
          throw new Error('未能从响应中提取图片数据');
        }
      } else {
        throw new Error('API返回数据为空');
      }
    } catch (err) {
      console.error('生成图片失败:', err);
      onError(err instanceof Error ? err.message : '生成失败，请重试');
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
      }));
    }
  };

  const downloadImage = (): void => {
    if (!generationState.generatedImage) return;

    const link = document.createElement('a');
    link.href = generationState.generatedImage;
    link.download = `ai-wedding-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onSuccess('图片下载成功！');
  };

  const copyBase64 = (): void => {
    if (!generationState.generatedImage) return;

    const base64String = generationState.generatedImage.split(',')[1];
    navigator.clipboard.writeText(base64String).then(() => {
      onSuccess('Base64数据已复制到剪贴板！');
    }).catch(() => {
      onError('复制失败');
    });
  };

  return {
    generationState,
    generateImage,
    downloadImage,
    copyBase64,
  };
}
