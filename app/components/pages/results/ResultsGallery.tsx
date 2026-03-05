import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Sparkles, X, Repeat, Heart } from 'lucide-react';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { ImageCompareSlider } from '@/components/ImageCompareSlider';
import { ResultsImageCard } from './ResultsImageCard';
import { ResultsPageData, ImageTab, ImageRating } from './types';

interface ResultsGalleryProps {
  generation: ResultsPageData | null;
  tab: ImageTab;
  setTab: (tab: ImageTab) => void;
  currentImages: string[];
  selectedImages: Set<number>;
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<number>>>;
  imageRatings: Map<number, ImageRating>;
  handlePurchase: () => void;
  isLiked: (index: number) => boolean;
  toggleLike: (index: number) => void;
  toggleImageSelection: (index: number) => void;
}

export const ResultsGallery = ({
  generation,
  tab,
  setTab,
  currentImages,
  selectedImages,
  setSelectedImages,
  imageRatings,
  handlePurchase,
  isLiked,
  toggleLike,
  toggleImageSelection,
}: ResultsGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <FadeIn delay={0.3}>
        <GlassCard className="mb-8 bg-transparent border-white/10">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex-1 border-l-2 border-gold pl-4">
                <h2 className="text-xl font-display font-medium text-alabaster tracking-wider">预览画廊</h2>
                <p className="text-sm text-pearl/60 font-light mt-1 tracking-wide">
                  {selectedImages.size > 0 ? `已选择 ${selectedImages.size} 张图片` : '选择图片购买'}
                </p>
              </div>

              {tab === 'preview' && currentImages.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedImages(new Set(currentImages.map((_, i) => i)))}
                    className="px-5 py-2.5 bg-white/5 text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all text-xs tracking-widest uppercase border border-white/10"
                  >
                    全选
                  </button>
                  <button
                    onClick={() => {
                      const next = new Set<number>();
                      currentImages.forEach((_, i) => { if (!selectedImages.has(i)) next.add(i); });
                      setSelectedImages(next);
                    }}
                    className="px-5 py-2.5 bg-white/5 text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all text-xs tracking-widest uppercase border border-white/10"
                  >
                    反选
                  </button>
                  <button
                    onClick={() => {
                      const topRated = Array.from(imageRatings.entries())
                        .sort((a, b) => b[1].score - a[1].score)
                        .slice(0, 3)
                        .map(([index]) => index);
                      setSelectedImages(new Set(topRated));
                    }}
                    className="px-5 py-2.5 bg-gold/10 text-gold rounded-sm hover:bg-gold/20 transition-all text-xs tracking-widest uppercase border border-gold/30 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    智能推荐
                  </button>
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={selectedImages.size === 0}
                className="px-8 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all disabled:opacity-50 uppercase tracking-widest text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                购买所选 ({selectedImages.size})
              </button>
            </div>

            <div className="mb-8 flex items-center gap-3">
              <button
                onClick={() => setTab('preview')}
                className={`px-8 py-2.5 rounded-sm text-xs font-medium tracking-widest uppercase transition-all border ${tab === 'preview' ? 'bg-gold text-obsidian border-gold' : 'bg-transparent text-pearl/60 border-white/10'}`}
              >
                预览
              </button>
              <button
                onClick={() => setTab('high_res')}
                className={`px-8 py-2.5 rounded-sm text-xs font-medium tracking-widest uppercase transition-all border ${tab === 'high_res' ? 'bg-gold text-obsidian border-gold' : 'bg-transparent text-pearl/60 border-white/10'}`}
                disabled={!generation?.high_res_images?.length}
              >
                高清{!generation?.high_res_images?.length ? ' (未解锁)' : ''}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentImages.map((url, index) => (
                <ResultsImageCard
                  key={index}
                  url={url}
                  index={index}
                  tab={tab}
                  isLiked={isLiked(index)}
                  isSelected={selectedImages.has(index)}
                  rating={imageRatings.get(index)}
                  onToggleLike={(e) => { e.stopPropagation(); toggleLike(index); }}
                  onToggleSelection={(e) => { e.stopPropagation(); toggleImageSelection(index); }}
                  onClick={() => setLightboxIndex(index)}
                />
              ))}
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {lightboxIndex !== null && (
        <Lightbox
          images={currentImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          isLiked={isLiked}
          onToggleLike={toggleLike}
          generationId={generation?.id}
          imageType={tab}
          originalPhotos={generation?.project?.uploaded_photos || []}
        />
      )}
    </>
  );
};

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  isLiked: (index: number) => boolean;
  onToggleLike: (index: number) => void;
  generationId?: string;
  imageType: ImageTab;
  originalPhotos: string[];
}

function Lightbox({ images, index, onClose, onIndexChange, isLiked, onToggleLike, generationId, imageType, originalPhotos }: LightboxProps) {
  const [compareMode, setCompareMode] = useState(false);
  const current = images[index];
  const originalPhoto = originalPhotos[index] || originalPhotos[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, index, onClose, onIndexChange]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
        <div className="text-pearl/80 text-sm font-medium tracking-widest">{index + 1} / {images.length}</div>
        <button onClick={onClose} className="p-2 bg-obsidian/40 border border-white/10 text-pearl rounded-sm"><X className="w-6 h-6" /></button>
      </div>

      <div className="relative w-full h-full max-w-6xl max-h-[85vh]">
        {compareMode && originalPhoto ? (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageCompareSlider beforeImage={originalPhoto} afterImage={current} beforeLabel="原图" afterLabel="AI生成" />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image src={current} alt="预览" fill className="object-contain" onClick={(e) => e.stopPropagation()} />
            {imageType === 'preview' && (
              <div className="absolute top-8 left-8 px-6 py-3 bg-obsidian/80 border border-gold/30 backdrop-blur-md text-gold text-xs font-medium tracking-widest uppercase rounded-sm">
                预览版 • 购买后无水印
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLike(index); }}
          className={`px-6 py-3 rounded-sm transition-all text-xs tracking-widest uppercase flex items-center gap-2 border ${isLiked(index) ? 'bg-gold border-gold text-obsidian' : 'bg-obsidian/60 border-white/10 text-pearl'}`}
        >
          <Heart className="w-4 h-4" /> {isLiked(index) ? '已收藏' : '收藏'}
        </button>
        <a
          href={current}
          download
          onClick={(e) => {
            e.stopPropagation();
            void fetch('/api/images/track-download', {
              method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ generation_id: generationId, index, image_type: imageType }),
            }).catch(() => {});
          }}
          className="px-6 py-3 bg-white/5 border border-white/10 text-pearl rounded-sm uppercase text-xs tracking-widest flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> 下载
        </a>
        {originalPhotos.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setCompareMode(!compareMode); }}
            className={`px-6 py-3 rounded-sm transition-all text-xs tracking-widest uppercase flex items-center gap-2 border ${compareMode ? 'bg-gold border-gold text-obsidian' : 'bg-obsidian/60 border-white/10 text-pearl'}`}
          >
            <Repeat className="w-4 h-4" /> {compareMode ? '退出对比' : '对比原图'}
          </button>
        )}
      </div>

      <button className="absolute left-8 p-3 bg-obsidian/40 border border-white/10 text-pearl rounded-full" onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length); }}>‹</button>
      <button className="absolute right-8 p-3 bg-obsidian/40 border border-white/10 text-pearl rounded-full" onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % images.length); }}>›</button>
    </div>
  );
}
