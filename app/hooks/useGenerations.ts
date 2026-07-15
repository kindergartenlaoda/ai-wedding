/**
 * 统一的生成 Hook - 支持批量和单图生成
 * 替代原有的 useImageGeneration 和 useSingleGenerations
 */

import { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Generation, GenerationType, Template } from '@/types/database';
import { generationReducer } from '@/types/generation';
import {
  generateAsGuest,
  generateAsAuthenticated,
  markGenerationFailed,
} from '@/lib/generation-service';
import type { GenerationInput } from '@/types/generation';

interface UseGenerationsOptions {
  generationType?: GenerationType;
  pageSize?: number;
  initialLoad?: boolean;
  template?: Template;
}

/**
 * 统一的生成 Hook
 * 支持：
 * 1. 列表查询（批量/单图）
 * 2. 生成流程（批量/单图）
 */
export function useGenerations(options: UseGenerationsOptions = {}) {
  const { generationType, pageSize = 20, initialLoad = true, template } = options;
  const { user, profile, refreshProfile } = useAuth();

  // List state
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const fetchedRef = useRef(false);

  // Generation flow state
  const [generationState, dispatch] = useReducer(generationReducer, { status: 'idle' });
  const savedStateRef = useRef<{
    photos: string[];
    projectName?: string;
    shareToGallery?: boolean;
    prompt?: string;
    originalImage?: string;
    settings?: object;
  } | null>(null);
  const currentGenerationIdRef = useRef<string | null>(null);

  /**
   * Fetch generations list
   */
  const fetchGenerations = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setGenerations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const typeParam = generationType ? `&type=${generationType}` : '';
      const res = await fetch(
        `/api/generations?page=${pageNum}&pageSize=${pageSize}${typeParam}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('获取失败');
      const json = await res.json();
      const data = (json.data || []) as Generation[];

      if (append) {
        setGenerations((prev) => [...prev, ...data]);
      } else {
        setGenerations(data);
      }

      setHasMore(json.hasMore ?? false);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取生成历史失败');
      console.error('获取生成历史失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user, pageSize, generationType]);

  useEffect(() => {
    if (initialLoad && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchGenerations(0, false);
    }
  }, [fetchGenerations, initialLoad]);

  const refreshGenerations = useCallback(async () => {
    await fetchGenerations(0, false);
  }, [fetchGenerations]);

  const loadMore = async () => {
    if (!loading && hasMore) {
      await fetchGenerations(page + 1, true);
    }
  };

  const deleteGeneration = async (id: string) => {
    try {
      const res = await fetch(`/api/generations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('删除失败');
      setGenerations((prev) => prev.filter((gen) => gen.id !== id));
      return true;
    } catch (err) {
      console.error('删除生成记录失败:', err);
      throw err;
    }
  };

  /**
   * Start batch generation
   */
  const startBatchGeneration = useCallback(
    async (photos: string[], projectName: string, shareToGallery = false) => {
      if (!template) {
        throw new Error('未选择模板');
      }

      if (photos.length < 1 || !projectName.trim()) {
        throw new Error('请上传照片并填写项目名称');
      }

      const savedState = { photos, projectName, shareToGallery };
      savedStateRef.current = savedState;

      dispatch({ type: 'START_GENERATION', savedState });

      const input: GenerationInput = {
        photos,
        projectName,
        template,
        shareToGallery,
      };

      try {
        let result;

        if (!profile) {
          result = await generateAsGuest(input, (progress) => {
            dispatch({
              type: 'UPDATE_PROGRESS',
              stage: progress.stage,
              progress: progress.progress,
            });
          });
        } else {
          result = await generateAsAuthenticated(input, profile.id, (progress) => {
            dispatch({
              type: 'UPDATE_PROGRESS',
              stage: progress.stage,
              progress: progress.progress,
            });
          });

          await refreshProfile();

          if (result.generationId) {
            currentGenerationIdRef.current = result.generationId;
          }
        }

        dispatch({
          type: 'COMPLETE',
          images: result.images,
          generationId: result.generationId,
        });

        // Refresh list
        await refreshGenerations();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '生成失败';

        if (currentGenerationIdRef.current) {
          await markGenerationFailed(currentGenerationIdRef.current, errorMessage);
        }

        dispatch({ type: 'FAIL', error: errorMessage });
        throw error;
      }
    },
    [template, profile, refreshProfile, refreshGenerations]
  );

  /**
   * Start single generation
   */
  const startSingleGeneration = useCallback(
    async (
      prompt: string,
      originalImage: string,
      settings: object = {},
      creditsUsed: number = 15
    ) => {
      if (!user) {
        throw new Error('请先登录');
      }

      const savedState = { photos: [originalImage], prompt, settings };
      savedStateRef.current = savedState;

      dispatch({ type: 'START_GENERATION', savedState });

      try {
        // Create generation record
        const createRes = await fetch('/api/generations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generation_type: 'single',
            prompt,
            original_image: originalImage,
            settings,
            credits_used: creditsUsed,
            domain: 'wedding',
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || '创建生成记录失败');
        }

        const genData = await createRes.json();
        currentGenerationIdRef.current = genData.id;

        dispatch({ type: 'UPDATE_PROGRESS', stage: 'generating', progress: 50 });

        // TODO: Call actual image generation API here
        // For now, simulate completion
        await new Promise((resolve) => setTimeout(resolve, 2000));

        dispatch({
          type: 'COMPLETE',
          images: [originalImage], // Replace with actual result
          generationId: genData.id,
        });

        await refreshProfile();
        await refreshGenerations();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '生成失败';

        if (currentGenerationIdRef.current) {
          await markGenerationFailed(currentGenerationIdRef.current, errorMessage);
        }

        dispatch({ type: 'FAIL', error: errorMessage });
        throw error;
      }
    },
    [user, refreshProfile, refreshGenerations]
  );

  /**
   * Retry generation
   */
  const retry = useCallback(async () => {
    if (!savedStateRef.current) {
      throw new Error('没有可重试的状态');
    }

    const saved = savedStateRef.current;

    if (saved.prompt && saved.photos[0]) {
      // Single generation
      await startSingleGeneration(
        saved.prompt,
        saved.photos[0],
        saved.settings || {}
      );
    } else if (saved.projectName) {
      // Batch generation
      await startBatchGeneration(
        saved.photos,
        saved.projectName,
        saved.shareToGallery
      );
    }
  }, [startBatchGeneration, startSingleGeneration]);

  /**
   * Reset generation state
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    savedStateRef.current = null;
    currentGenerationIdRef.current = null;
  }, []);

  /**
   * Check if can generate
   */
  const canGenerate = useCallback(
    (photos: string[], projectNameOrPrompt: string): boolean => {
      if (photos.length < 1 || !projectNameOrPrompt.trim()) {
        return false;
      }

      if (!profile) {
        return true; // Guest mode
      }

      const requiredCredits = template?.price_credits || 15;
      return profile.credits >= requiredCredits;
    },
    [profile, template]
  );

  return {
    // List operations
    generations,
    loading,
    error,
    hasMore,
    page,
    refreshGenerations,
    loadMore,
    deleteGeneration,

    // Generation flow
    generationState,
    startBatchGeneration,
    startSingleGeneration,
    retry,
    reset,
    canGenerate,
    savedState: savedStateRef.current,
  };
}

/**
 * Backward compatibility: useImageGeneration
 */
export function useImageGeneration(options: { template?: Template }) {
  const hook = useGenerations({ ...options, generationType: 'batch' });

  return {
    state: hook.generationState,
    startGeneration: hook.startBatchGeneration,
    retry: hook.retry,
    reset: hook.reset,
    canGenerate: hook.canGenerate,
    savedState: hook.savedState,
  };
}

/**
 * Backward compatibility: useSingleGenerations
 */
export function useSingleGenerations(options: { pageSize?: number; initialLoad?: boolean } = {}) {
  const hook = useGenerations({ ...options, generationType: 'single' });

  return {
    generations: hook.generations,
    loading: hook.loading,
    error: hook.error,
    hasMore: hook.hasMore,
    page: hook.page,
    refreshGenerations: hook.refreshGenerations,
    loadMore: hook.loadMore,
    deleteGeneration: hook.deleteGeneration,
  };
}
