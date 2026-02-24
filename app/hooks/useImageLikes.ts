import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useImageLikes(generationId?: string, imageType: 'preview' | 'high_res' = 'preview') {
  const { user } = useAuth();
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(!!(user && generationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchLikes() {
      if (!user || !generationId) {
        setLiked(new Set());
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/image-likes?generationId=${encodeURIComponent(generationId)}&imageType=${imageType}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('获取失败');
        const json = await res.json();
        if (!active) return;
        setLiked(new Set((json.data || []) as number[]));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '获取收藏失败');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchLikes();
    return () => { active = false; };
  }, [user, generationId, imageType]);

  const toggleLike = useCallback(
    async (index: number) => {
      if (!user || !generationId) {
        setLiked((prev) => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        });
        return;
      }
      const has = liked.has(index);
      const optimistic = new Set(liked);
      if (has) optimistic.delete(index);
      else optimistic.add(index);
      setLiked(optimistic);
      try {
        const res = await fetch('/api/image-likes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationId,
            imageIndex: index,
            imageType,
            action: has ? 'remove' : 'add',
          }),
        });
        if (!res.ok) throw new Error('更新失败');
      } catch (err) {
        setLiked(liked);
        setError(err instanceof Error ? err.message : '更新收藏失败');
      }
    },
    [user, generationId, liked, imageType]
  );

  return { liked, loading, error, toggleLike };
}
