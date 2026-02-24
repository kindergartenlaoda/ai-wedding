import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectWithTemplate } from '@/types/database';

interface UseProjectsOptions {
  pageSize?: number;
  initialLoad?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { pageSize = 20, initialLoad = true } = options;
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithTemplate[]>([]);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchProjects = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/projects?page=${pageNum}&pageSize=${pageSize}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('获取项目失败');
      const json = await res.json();
      const formattedProjects: ProjectWithTemplate[] = json.data || [];

      if (append) {
        setProjects((prev) => [...prev, ...formattedProjects]);
      } else {
        setProjects(formattedProjects);
      }

      setHasMore(json.hasMore ?? false);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取项目失败');
    } finally {
      setLoading(false);
    }
  }, [user, pageSize]);

  useEffect(() => {
    if (initialLoad) {
      fetchProjects(0, false);
    }
  }, [fetchProjects, initialLoad]);

  const refreshProjects = async () => {
    await fetchProjects(0, false);
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      await fetchProjects(page + 1, true);
    }
  };

  return {
    projects,
    loading,
    error,
    hasMore,
    page,
    refreshProjects,
    loadMore,
  };
}
