/**
 * 生成结果展示组件
 * 从原 CreatePage 提取 150+ 行结果展示逻辑
 */

import { useState } from 'react';
import { Sparkles, AlertCircle, Heart, Eye, Download, ArrowLeft, Check } from 'lucide-react';
import NextImage from 'next/image';
import { GlassCard, FadeIn } from '@/components/react-bits';
import { ImagePreviewModal } from './ImagePreviewModal';

interface GenerationResultsProps {
  images: string[];
  generationId: string | null;
  projectName: string;
  onNavigateToDashboard: () => void;
}

export function GenerationResults({
  images,
  generationId,
  projectName,
  onNavigateToDashboard,
}: GenerationResultsProps) {
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const toggleFavorite = (index: number) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(index)) {
        newFavorites.delete(index);
      } else {
        newFavorites.add(index);
      }
      return newFavorites;
    });
  };

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${projectName || '作品'}_预览_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setToast({ message: '图片下载成功！', type: 'success' });
    } catch (error) {
      console.error('下载失败:', error);
      setToast({ message: '下载失败，请重试', type: 'error' });
    }
  };

  return (
    <>
      <FadeIn delay={0.4}>
        <GlassCard className="mt-8 bg-obsidian border-white/10 shadow-xl">
          <div className="p-8">
            <div className="flex gap-3 items-center mb-6">
              <div className="flex justify-center items-center w-12 h-12 bg-white/5 border border-white/10 rounded-sm shadow-sm">
                <Sparkles className="w-6 h-6 text-gold opacity-80" />
              </div>
              <div>
                <h2 className="text-2xl font-medium font-display text-alabaster tracking-wider">生成完成！</h2>
                <p className="text-pearl/60 font-light tracking-wide">为您生成了 <span className="text-gold">{images.length}</span> 张精美作品</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {images.map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-[3/4] rounded-sm overflow-hidden group border border-white/5 hover:border-gold/50 transition-all duration-700 hover:shadow-[0_0_25px_rgba(200,160,100,0.15)] bg-obsidian"
                >
                  <NextImage
                    src={url}
                    alt={`生成结果 ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />

                  {/* 悬停遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  {/* 顶部按钮组 */}
                  <div className="flex absolute top-3 right-3 gap-2 items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <button
                      onClick={() => toggleFavorite(index)}
                      className={`flex justify-center items-center w-10 h-10 rounded-full shadow-xl backdrop-blur-md transition-all duration-500 border ${favorites.has(index)
                        ? 'bg-gold border-gold text-obsidian scale-110'
                        : 'bg-obsidian/40 border-white/20 text-pearl hover:text-alabaster hover:bg-obsidian/80 hover:border-white/40'
                        }`}
                      aria-label="收藏"
                    >
                      <Heart className={`w-5 h-5 ${favorites.has(index) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* 底部信息和操作栏 */}
                  <div className="flex absolute right-4 bottom-4 left-4 gap-2 justify-between items-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <span className="px-2 py-1 text-xs font-medium tracking-widest uppercase rounded-sm border border-white/10 backdrop-blur-md text-pearl bg-obsidian/60">
                      #{index + 1}
                    </span>

                    <div className="flex gap-2">
                      {/* 查看大图 */}
                      <button
                        onClick={() => setPreviewImageIndex(index)}
                        className="flex justify-center items-center w-10 h-10 rounded-full shadow-xl backdrop-blur-md border border-white/20 transition-all duration-500 bg-obsidian/60 hover:bg-white/10 hover:text-alabaster hover:scale-110 text-pearl"
                        aria-label="查看大图"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* 下载 */}
                      <button
                        onClick={() => handleDownloadImage(url, index)}
                        className="flex justify-center items-center w-10 h-10 rounded-full shadow-xl backdrop-blur-md border border-white/20 transition-all duration-500 bg-obsidian/60 hover:bg-white/10 hover:text-alabaster hover:scale-110 text-pearl"
                        aria-label="下载图片"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 收藏标记（固定显示） */}
                  {favorites.has(index) && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-sm backdrop-blur-md bg-gold border border-gold text-obsidian shadow-lg">
                      已收藏
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 收藏统计 */}
            {favorites.size > 0 && (
              <div className="p-4 mb-4 rounded-sm border bg-gold/5 border-gold/20 shadow-sm">
                <div className="flex gap-2 items-center text-sm text-alabaster">
                  <Heart className="w-4 h-4 fill-current text-gold" />
                  <span>
                    您收藏了 <strong className="text-gold">{favorites.size}</strong> 张照片
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 justify-center sm:flex-row">
              <button
                onClick={() =>
                  generationId && (window.location.href = `/results/${generationId}`)
                }
                className="flex gap-2 justify-center items-center px-8 py-3 text-xs tracking-widest uppercase font-medium bg-obsidian border border-transparent rounded-sm shadow-sm transition-all duration-500 text-alabaster hover:bg-gold hover:text-obsidian hover:shadow-[0_0_20px_rgba(200,160,100,0.3)]"
              >
                <Sparkles className="w-4 h-4" />
                查看完整结果页面
              </button>
              <button
                onClick={onNavigateToDashboard}
                className="flex gap-2 justify-center items-center px-8 py-3 text-xs tracking-widest uppercase font-medium rounded-sm border transition-all duration-500 bg-transparent text-pearl hover:text-alabaster hover:bg-white/5 border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                返回仪表盘
              </button>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* 图片预览模态框 */}
      {previewImageIndex !== null && (
        <ImagePreviewModal
          images={images}
          initialIndex={previewImageIndex}
          isOpen={previewImageIndex !== null}
          onClose={() => setPreviewImageIndex(null)}
          onDownload={handleDownloadImage}
          projectName={projectName || '作品预览'}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <div className="flex fixed top-4 left-1/2 -translate-x-1/2 z-50 gap-2 items-center px-6 py-3 rounded-sm shadow-2xl bg-obsidian border border-white/10 text-alabaster text-sm tracking-widest">
          {toast.type === 'success' ? <Check className="w-4 h-4 text-gold" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.message}
        </div>
      )}
    </>
  );
}
