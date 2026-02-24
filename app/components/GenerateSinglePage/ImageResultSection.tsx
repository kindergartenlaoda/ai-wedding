import Image from 'next/image';
import { Sparkles, Loader2, Download, Copy, Info, Maximize2 } from 'lucide-react';

interface ImageResultSectionProps {
  isGenerating: boolean;
  generatedImage: string | null;
  streamingContent: string;
  onDownload: () => void;
  onCopyBase64: () => void;
  onViewImage: (imageUrl: string, title: string) => void;
}

export function ImageResultSection({
  isGenerating,
  generatedImage,
  streamingContent,
  onDownload,
  onCopyBase64,
  onViewImage,
}: ImageResultSectionProps) {
  return (
    <div className="p-8 rounded-sm border shadow-sm bg-stone/5 border-stone/10 h-full flex flex-col">
      <h2 className="flex gap-3 items-center mb-6 text-xl font-medium font-display text-obsidian uppercase tracking-widest">
        <Sparkles className="w-5 h-5 text-gold" />
        视觉呈现
      </h2>

      <div className="border border-dashed border-stone/30 rounded-sm p-8 flex-1 flex flex-col items-center justify-center min-h-[300px]">
        {isGenerating ? (
          <div className="space-y-6 text-center">
            <Loader2 className="mx-auto w-10 h-10 animate-spin text-gold" />
            <p className="text-obsidian tracking-widest uppercase font-medium">光影构筑中...</p>
            {streamingContent && (
              <p className="text-xs text-stone font-light tracking-wide">已接收 {streamingContent.length} 字符</p>
            )}
          </div>
        ) : generatedImage ? (
          <div className="space-y-6 w-full h-full flex flex-col">
            <div className="relative w-full flex-1 min-h-[300px] rounded-sm overflow-hidden group shadow-lg">
              <Image
                src={generatedImage}
                alt="生成的视觉作品"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <button
                onClick={() => onViewImage(generatedImage, '视觉呈现')}
                className="flex absolute inset-0 justify-center items-center opacity-0 transition-all duration-500 bg-obsidian/60 group-hover:opacity-100"
              >
                <div className="p-4 rounded-full bg-alabaster/90 shadow-xl transform transition-transform duration-500 scale-90 group-hover:scale-100">
                  <Maximize2 className="w-6 h-6 text-obsidian" />
                </div>
              </button>
            </div>

            <div className="flex gap-3 items-start p-4 bg-stone/5 rounded-sm border border-stone/10">
              <Info className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="text-sm text-stone font-light tracking-wide">
                <p className="mb-1 font-medium text-obsidian uppercase tracking-widest text-xs">重要提示</p>
                <p>作品满意请及时下载保存，本页面不会自动储存您的生成结果。</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onDownload}
                className="flex flex-1 gap-3 justify-center items-center px-4 py-4 text-xs font-medium rounded-sm transition-all duration-500 bg-obsidian text-alabaster hover:bg-gold hover:text-obsidian uppercase tracking-widest"
              >
                <Download className="w-4 h-4" />
                下载作品
              </button>
              <button
                onClick={onCopyBase64}
                className="flex flex-1 gap-3 justify-center items-center px-4 py-4 text-xs font-medium rounded-sm transition-all duration-500 bg-transparent border border-stone/20 text-obsidian hover:bg-stone/10 hover:border-obsidian uppercase tracking-widest"
              >
                <Copy className="w-4 h-4" />
                复制编码
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-stone flex flex-col items-center justify-center">
            <div className="flex justify-center items-center w-20 h-20 rounded-full bg-stone/5 border border-stone/10 shadow-sm mb-6 transition-transform duration-500 hover:scale-110">
              <Sparkles className="w-8 h-8 text-gold" />
            </div>
            <p className="text-sm font-light tracking-widest uppercase">视觉作品将在此呈现</p>
          </div>
        )}
      </div>
    </div>
  );
}
