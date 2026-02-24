import { useState, useEffect, useCallback, useRef } from 'react';
import { Template } from '@/types/database';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchTemplates = useCallback(async () => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      const res = await fetch('/api/templates', { credentials: 'include' });
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
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error };
}
