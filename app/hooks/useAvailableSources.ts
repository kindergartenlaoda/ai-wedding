import { useState, useEffect, useCallback, useRef } from 'react';
import type { ModelConfigSource } from '@/types/model-config';

export interface UseAvailableSourcesResult {
  sources: ModelConfigSource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch available model sources from active configurations
 */
export function useAvailableSources(): UseAvailableSourcesResult {
  const [sources, setSources] = useState<ModelConfigSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchSources = useCallback(async (): Promise<void> => {
    // 防止重复请求
    if (fetchingRef.current) {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const response = await fetch('/api/model-sources/available', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setError('未登录');
        setSources([]);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取可用模型来源失败');
      }

      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error('获取可用模型来源出错:', err);
      setError(err instanceof Error ? err.message : '获取可用模型来源失败');
      setSources([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources,
  };
}
