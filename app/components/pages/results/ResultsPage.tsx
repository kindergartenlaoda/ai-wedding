import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImageLikes } from '@/hooks/useImageLikes';
import { rateImages } from '@/lib/image-rating';
import { FadeIn } from '@/components/react-bits';
import { GenerationFeedback } from '@/components/GenerationFeedback';
import { ResultsHeader } from './ResultsHeader';
import { ResultsGallery } from './ResultsGallery';
import { LoadingState, ErrorState, EmptyState } from './ResultsStates';
import { ResultsPageProps, ResultsPageData, ImageTab } from './types';

const ShareModal = dynamic(() => import('@/components/ShareModal').then(mod => ({ default: mod.ShareModal })), { ssr: false });

export function ResultsPage({ onNavigate, generationId }: ResultsPageProps) {
  const { user } = useAuth();
  const [generation, setGeneration] = useState<ResultsPageData | null>(null);
  const [loading, setLoading] = useState(!!generationId);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<ImageTab>('preview');
  const [showShareModal, setShowShareModal] = useState(false);

  const { liked: likedPreview, toggleLike: toggleLikePreview } = useImageLikes(generationId, 'preview');
  const { liked: likedHigh, toggleLike: toggleLikeHigh } = useImageLikes(generationId, 'high_res');

  useEffect(() => {
    if (!generationId) {
      setLoading(false);
      setError('未提供生成 ID');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/generations/${generationId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();
        if (!data) throw new Error('未找到生成记录');
        setGeneration({
          ...data,
          project: data.project || { name: '', uploaded_photos: [] },
          template: data.template || { name: '' },
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [generationId]);

  const currentImages = useMemo(() => {
    return tab === 'preview' ? (generation?.preview_images || []) : (generation?.high_res_images || []);
  }, [generation, tab]);

  const imageRatings = useMemo(() => rateImages(currentImages), [currentImages]);

  const toggleImageSelection = useCallback((index: number) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  const isLiked = useCallback((index: number) => {
    return (tab === 'preview' ? likedPreview : likedHigh).has(index);
  }, [likedPreview, likedHigh, tab]);

  const toggleLike = useCallback((index: number) => {
    (tab === 'preview' ? toggleLikePreview : toggleLikeHigh)(index);
  }, [toggleLikePreview, toggleLikeHigh, tab]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onNavigate={onNavigate} />;
  if (!generation || currentImages.length === 0) return <EmptyState generation={generation} tab={tab} onNavigate={onNavigate} />;

  return (
    <div className="min-h-screen bg-obsidian py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.1}>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
            aria-label="返回仪表盘"
          >
            <ArrowLeft className="w-5 h-5" />
            返回仪表盘
          </button>
        </FadeIn>

        <ResultsHeader
          generation={generation}
          currentImagesCount={currentImages.length}
          onShowShareModal={() => setShowShareModal(true)}
        />

        <ResultsGallery
          generation={generation}
          tab={tab}
          setTab={setTab}
          currentImages={currentImages}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          imageRatings={imageRatings}
          handlePurchase={() => onNavigate('pricing')}
          isLiked={isLiked}
          toggleLike={toggleLike}
          toggleImageSelection={toggleImageSelection}
        />
      </div>

      {generationId && generation?.status === 'completed' && currentImages.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <FadeIn delay={0.5}><GenerationFeedback generationId={generationId} /></FadeIn>
        </div>
      )}

      {showShareModal && generation && currentImages.length > 0 && (
        <ShareModal
          projectName={generation.project?.name || '我的项目'}
          templateName={generation.template?.name || '精美风格'}
          imageUrl={currentImages[0] || ''}
          imageCount={currentImages.length}
          shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/results/${generationId}`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
