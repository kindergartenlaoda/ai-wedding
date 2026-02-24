import { useState } from 'react';
import type { PromptItem, PromptsResponse } from '@/types/prompt';

interface UsePromptGenerationReturn {
  isGenerating: boolean;
  prompts: PromptItem[];
  generatePrompts: (imageBase64: string) => Promise<void>;
  error: string | null;
  clearPrompts: () => void;
}

/**
 * 风格方案生成 Hook
 * 用于根据上传的图片生成风格方案
 */
export function usePromptGeneration(): UsePromptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePrompts = async (imageBase64: string): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    setPrompts([]);

    try {
      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      if (response.status === 401) {
        throw new Error('未登录，无法生成风格方案');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '风格方案生成失败');
      }

      const result: PromptsResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '风格方案生成失败');
      }

      setPrompts(result.prompts);
    } catch (err) {
      const message = err instanceof Error ? err.message : '风格方案生成失败';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearPrompts = (): void => {
    setPrompts([]);
    setError(null);
  };

  return {
    isGenerating,
    prompts,
    generatePrompts,
    error,
    clearPrompts,
  };
}

