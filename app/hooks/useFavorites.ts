import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    async function fetchFavorites() {
      try {
        const res = await fetch('/api/favorites', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const ids = (json.data || []) as string[];
          setFavorites(new Set(ids));
        }
      } catch (err) {
        console.error('获取收藏失败:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [user]);

  const toggleFavorite = async (templateId: string) => {
    if (!user) return;

    const newFavorites = new Set(favorites);
    const isFavorited = favorites.has(templateId);

    if (isFavorited) {
      newFavorites.delete(templateId);
      setFavorites(newFavorites);

      const res = await fetch('/api/favorites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, action: 'remove' }),
      });

      if (!res.ok) {
        newFavorites.add(templateId);
        setFavorites(newFavorites);
        console.error('取消收藏失败');
      }
    } else {
      newFavorites.add(templateId);
      setFavorites(newFavorites);

      const res = await fetch('/api/favorites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, action: 'add' }),
      });

      if (!res.ok) {
        newFavorites.delete(templateId);
        setFavorites(newFavorites);
        console.error('添加收藏失败');
      }
    }
  };

  return { favorites, loading, toggleFavorite };
}
