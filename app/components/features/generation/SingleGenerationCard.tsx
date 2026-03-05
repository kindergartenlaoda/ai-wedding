import { useState } from 'react';
import Image from 'next/image';
import { Calendar, Coins, Eye } from 'lucide-react';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { SingleGeneration } from '@/types/database';

interface SingleGenerationCardProps {
  generation: SingleGeneration;
  onDelete?: (id: string) => void;
  onView?: (generation: SingleGeneration) => void;
}

export function SingleGenerationCard({ generation, onView }: SingleGenerationCardProps) {
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncatePrompt = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <div className="overflow-hidden bg-obsidian rounded-sm border shadow-sm transition-all duration-700 border-white/10 hover:shadow-[0_0_30px_rgba(200,160,100,0.15)] hover:border-gold/30">
        {/* 提示词 - 悬浮显示完整内容 */}
        <div className="relative p-5 border-b bg-white/5 border-white/10 group">
          <p
            className="text-xs leading-relaxed cursor-help text-alabaster line-clamp-2 tracking-wide font-light"
            title={generation.prompt.length > 120 ? '悬浮查看完整提示词' : generation.prompt}
          >
            {truncatePrompt(generation.prompt, 120)}
          </p>

          {/* 悬浮显示完整提示词 */}
          {generation.prompt.length > 120 && (
            <div className="hidden absolute right-0 left-0 top-full z-20 pt-2 group-hover:block">
              <div className="p-5 bg-obsidian rounded-sm border shadow-2xl duration-500 border-white/20 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2 justify-between items-start mb-3">
                  <p className="text-xs font-medium text-gold uppercase tracking-widest">完整提示词</p>
                  <span className="text-xs text-pearl/50 uppercase tracking-widest">{generation.prompt.length} 字符</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-alabaster max-h-[300px] overflow-y-auto font-light tracking-wide">
                  {generation.prompt}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 图片对比 - 点击查看大图 */}
        <div className="grid grid-cols-2 gap-4 p-5">
          {/* 原图 */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-pearl/60 uppercase tracking-widest text-center">原图</p>
            <button
              type="button"
              className="overflow-hidden relative w-full rounded-sm transition-all aspect-square bg-white/5 border border-white/10 group focus:outline-none focus:ring-1 focus:ring-gold focus:ring-offset-2 focus:ring-offset-obsidian"
              onClick={() => setPreviewImage({ src: generation.original_image, alt: '原图' })}
              aria-label="查看原图大图"
            >
              <Image
                src={generation.original_image}
                alt="原图"
                fill
                className="object-cover transition-all duration-500 ease-smooth group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {/* 悬浮提示 */}
              <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity duration-500 bg-obsidian/80 group-hover:opacity-100 backdrop-blur-sm">
                <div className="text-center transition-transform duration-500 transform translate-y-4 group-hover:translate-y-0">
                  <p className="text-xs font-medium text-gold uppercase tracking-[0.2em] drop-shadow-lg">点击查看</p>
                </div>
              </div>
            </button>
          </div>

          {/* 结果图 */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-pearl/60 uppercase tracking-widest text-center">生成结果</p>
            <button
              type="button"
              className="overflow-hidden relative w-full rounded-sm transition-all aspect-square bg-white/5 border border-white/10 group focus:outline-none focus:ring-1 focus:ring-gold focus:ring-offset-2 focus:ring-offset-obsidian"
              onClick={() => setPreviewImage({ src: generation.result_image, alt: '生成结果' })}
              aria-label="查看生成结果大图"
            >
              <Image
                src={generation.result_image}
                alt="生成结果"
                fill
                className="object-cover transition-all duration-500 ease-smooth group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {/* 悬浮提示 */}
              <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity duration-500 bg-obsidian/80 group-hover:opacity-100 backdrop-blur-sm">
                <div className="text-center transition-transform duration-500 transform translate-y-4 group-hover:translate-y-0">
                  <p className="text-xs font-medium text-gold uppercase tracking-[0.2em] drop-shadow-lg">点击查看</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 底部信息和操作 */}
        <div className="flex justify-between items-center p-5 border-t bg-white/5 border-white/10">
          {/* 左侧信息 */}
          <div className="flex gap-4 items-center text-xs font-light text-pearl/60 uppercase tracking-widest">
            <div className="flex gap-1 items-center" title="创建时间">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(generation.created_at)}</span>
            </div>
            <div className="flex gap-1 items-center" title="消耗积分">
              <Coins className="w-3.5 h-3.5" />
              <span>{generation.credits_used}</span>
            </div>
          </div>

          {/* 右侧操作按钮 - 只保留查看详情 */}
          {onView && (
            <button
              onClick={() => onView(generation)}
              className="p-2.5 rounded-sm transition-all duration-500 hover:bg-white/10 group border border-transparent hover:border-white/20"
              title="查看详情"
            >
              <Eye className="w-4 h-4 text-pearl/70 transition-colors group-hover:text-gold" />
            </button>
          )}
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {previewImage && (
        <ImagePreviewModal
          images={[previewImage.src]}
          initialIndex={0}
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          onDownload={async (url: string) => {
            try {
              const response = await fetch(url);
              const blob = await response.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = `${previewImage.alt}-${Date.now()}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);
            } catch (error) {
              console.error('下载失败:', error);
            }
          }}
          projectName={previewImage.alt}
        />
      )}
    </>
  );
}

