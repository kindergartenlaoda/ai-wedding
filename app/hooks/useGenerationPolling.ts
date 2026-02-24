import { useState, useEffect, useCallback } from 'react';
import type { GenerationWithRelations } from '@/types/database';

export function useGenerationPolling(generationId: string | null, enabled: boolean = false) {
  const [generation, setGeneration] = useState<GenerationWithRelations | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchGeneration = useCallback(async () => {
    if (!generationId) return null;

    try {
      const res = await fetch(`/api/generations/${generationId}`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as GenerationWithRelations;
      return data;
    } catch (error) {
      console.error('获取生成状态失败:', error);
      return null;
    }
  }, [generationId]);

  useEffect(() => {
    if (!enabled || !generationId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    let pollInterval: ReturnType<typeof setInterval>;

    const startPolling = (currentStatus?: string) => {
      if (pollInterval) clearInterval(pollInterval);
      const interval = currentStatus === 'pending' ? 10000 : 3000;

      pollInterval = setInterval(async () => {
        const data = await fetchGeneration();
        if (data) {
          setGeneration(data);
          if (data.status === 'completed' || data.status === 'failed') {
            setIsPolling(false);
            clearInterval(pollInterval);
          } else if (data.status !== currentStatus) {
            startPolling(data.status);
          }
        }
      }, interval);
    };

    fetchGeneration().then((data) => {
      if (data) {
        setGeneration(data);
        startPolling(data.status);
      } else {
        startPolling();
      }
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [generationId, enabled, fetchGeneration]);

  return { generation, isPolling, refetch: fetchGeneration };
}
