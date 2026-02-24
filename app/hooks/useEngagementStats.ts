import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useEngagementStats() {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [downloads, setDownloads] = useState(0);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      if (!user) {
        setLikes(0);
        setDownloads(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/engagement-stats', { credentials: 'include' });
        if (!res.ok) throw new Error('获取失败');
        const json = await res.json();
        if (!active) return;
        setLikes(json.likes ?? 0);
        setDownloads(json.downloads ?? 0);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '获取互动统计失败');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStats();
    return () => { active = false; };
  }, [user]);

  return { likes, downloads, loading, error };
}
