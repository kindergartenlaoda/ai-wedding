import { useState } from 'react';

interface IdentifyResult {
  index: number;
  success: boolean;
  hasPerson: boolean;
  confidence: number;
  description: string;
}

interface IdentifyResponse {
  success: boolean;
  total: number;
  validCount: number;
  invalidCount: number;
  results: IdentifyResult[];
  allValid: boolean;
}

interface UseImageIdentificationReturn {
  isIdentifying: boolean;
  identifyImages: (images: string[]) => Promise<IdentifyResponse>;
  error: string | null;
}

/**
 * 图片识别 Hook
 * 用于验证上传的图片是否包含人物
 */
export function useImageIdentification(): UseImageIdentificationReturn {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifyImages = async (images: string[]): Promise<IdentifyResponse> => {
    setIsIdentifying(true);
    setError(null);

    try {
      const response = await fetch('/api/identify-image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      if (response.status === 401) {
        throw new Error('未登录，无法进行图片识别');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '图片识别失败');
      }

      const result: IdentifyResponse = await response.json();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '图片识别失败';
      setError(message);
      throw err;
    } finally {
      setIsIdentifying(false);
    }
  };

  return {
    isIdentifying,
    identifyImages,
    error,
  };
}

