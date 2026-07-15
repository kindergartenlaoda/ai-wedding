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
  const isIdentifying = false;
  const error: string | null = null;

  const identifyImages = async (images: string[]): Promise<IdentifyResponse> => {
    // TODO: 暂时跳过 identify-image 接口调用，直接返回全部通过
    return {
      success: true,
      total: images.length,
      validCount: images.length,
      invalidCount: 0,
      results: images.map((_, index) => ({
        index,
        success: true,
        hasPerson: true,
        confidence: 1,
        description: '跳过识别（临时禁用）',
      })),
      allValid: true,
    };
  };

  return {
    isIdentifying,
    identifyImages,
    error,
  };
}

