import { useState } from 'react';
import type { PromptItem, PromptsResponse } from '@/types/prompt';

interface UsePromptGenerationReturn {
  isGenerating: boolean;
  progress: number;
  prompts: PromptItem[];
  generatePrompts: (imageBase64: string) => Promise<void>;
  error: string | null;
  clearPrompts: () => void;
}

export function usePromptGeneration(): UsePromptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePrompts = async (imageBase64: string): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    setPrompts([]);
    setProgress(0);

    try {
      setProgress(20);

      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      setProgress(40);

      if (response.status === 401) {
        throw new Error('未登录，无法生成风格方案');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '风格方案生成失败');
      }

      setProgress(70);

      const result: PromptsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || '风格方案生成失败');
      }

      setProgress(90);
      setPrompts(result.prompts);
      setProgress(100);
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
    setProgress(0);
  };

  return {
    isGenerating,
    progress,
    prompts,
    generatePrompts,
    error,
    clearPrompts,
  };
}
