import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SingleGeneration } from '@/types/database';

interface UseSingleGenerationsOptions {
  pageSize?: number;
  initialLoad?: boolean;
}

export function useSingleGenerations(options: UseSingleGenerationsOptions = {}) {
  const { pageSize = 20, initialLoad = true } = options;
  const { user } = useAuth();
  const [generations, setGenerations] = useState<SingleGeneration[]>([]);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const fetchedRef = useRef(false);

  const fetchGenerations = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setGenerations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/single-generations/list?page=${pageNum}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('获取失败');
      const json = await res.json();
      const data = (json.data || []) as SingleGeneration[];

      if (append) {
        setGenerations((prev) => [...prev, ...data]);
      } else {
        setGenerations(data);
      }

      setHasMore(json.hasMore ?? false);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取单张生成历史失败');
      console.error('获取单张生成历史失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user, pageSize]);

  useEffect(() => {
    if (initialLoad && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchGenerations(0, false);
    }
  }, [fetchGenerations, initialLoad]);

  const refreshGenerations = async () => {
    await fetchGenerations(0, false);
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      await fetchGenerations(page + 1, true);
    }
  };

  const deleteGeneration = async (id: string) => {
    try {
      const res = await fetch(`/api/single-generations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('删除失败');
      setGenerations((prev) => prev.filter((gen) => gen.id !== id));
      return true;
    } catch (err) {
      console.error('删除单张生成记录失败:', err);
      throw err;
    }
  };

  return {
    generations,
    loading,
    error,
    hasMore,
    page,
    refreshGenerations,
    loadMore,
    deleteGeneration,
  };
}
