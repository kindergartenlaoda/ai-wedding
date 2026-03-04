import { useState, useEffect } from 'react';
import type { PromptItem } from '@/types/prompt';

interface PromptGenerationRecord {
  id: string;
  domain: string;
  prompts: PromptItem[];
  credits_used: number;
  created_at: string;
}

interface UsePromptHistoryReturn {
  records: PromptGenerationRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePromptHistory(): UsePromptHistoryReturn {
  const [records, setRecords] = useState<PromptGenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prompt-generations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();
      setRecords(data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    refresh: fetchRecords,
  };
}
