import { useState, useEffect, useCallback, useRef } from 'react';
import { Template } from '@/types/database';

interface UseTemplatesOptions {
  /** 按领域筛选，如 wedding、children */
  domain?: string;
}

export function useTemplates(options?: UseTemplatesOptions) {
  const domain = options?.domain;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchTemplates = useCallback(async () => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      const url = domain
        ? `/api/templates?domain=${encodeURIComponent(domain)}`
        : '/api/templates';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('获取模板失败');
      const json = await res.json();
      const data = json.data || [];
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取模板失败');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [domain]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error };
}
