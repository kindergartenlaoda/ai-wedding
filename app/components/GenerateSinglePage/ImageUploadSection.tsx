import Image from 'next/image';
import { Upload, Loader2, ImageIcon, Maximize2, CheckCircle } from 'lucide-react';

interface ImageUploadSectionProps {
  originalImage: string | null;
  originalImageFile: File | null;
  isDragging: boolean;
  isValidatingImage: boolean;
  user: { id: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onViewImage: (imageUrl: string, title: string) => void;
}

export function ImageUploadSection({
  originalImage,
  originalImageFile,
  isDragging,
  isValidatingImage,
  user,
  fileInputRef,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onViewImage,
}: ImageUploadSectionProps) {
  return (
    <div className="p-8 rounded-sm border shadow-inner bg-black/40 border-white/10 h-full flex flex-col">
      <h2 className="flex gap-3 items-center mb-6 text-xl font-medium font-display text-alabaster uppercase tracking-widest">
        <Upload className="w-5 h-5 text-gold" />
        上传原图
      </h2>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border border-dashed rounded-sm p-8 text-center cursor-pointer transition-all duration-500 flex-1 flex flex-col justify-center min-h-[300px] ${isDragging
          ? 'border-gold bg-gold/5'
          : 'border-white/10 hover:border-gold/50 hover:bg-white/5'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileSelect}
          className="hidden"
        />
        {originalImage ? (
          <div className="space-y-6">
            <div className="relative w-full aspect-[4/3] rounded-sm overflow-hidden group shadow-lg">
              <Image
                src={originalImage}
                alt="原图预览"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onViewImage(originalImage, '原图'); }}
                className="flex absolute inset-0 justify-center items-center opacity-0 transition-all duration-500 bg-obsidian/60 group-hover:opacity-100"
              >
                <div className="p-4 rounded-full bg-white/10 border border-white/10 shadow-xl transform transition-transform duration-500 scale-90 group-hover:scale-100 backdrop-blur-md">
                  <Maximize2 className="w-6 h-6 text-alabaster" />
                </div>
              </button>
            </div>
            {originalImageFile && (
              <div className="space-y-2 text-xs font-light text-pearl/60 tracking-wider text-left bg-white/5 p-4 rounded-sm border border-white/5">
                <p className="flex justify-between border-b border-white/10 pb-2"><span className="font-medium text-alabaster uppercase tracking-widest">文件名</span> <span className="truncate ml-4 max-w-[200px]">{originalImageFile.name}</span></p>
                <p className="flex justify-between pt-1"><span className="font-medium text-alabaster uppercase tracking-widest">大小</span> <span>{(originalImageFile.size / 1024 / 1024).toFixed(2)} MB</span></p>
              </div>
            )}
          </div>
        ) : isValidatingImage ? (
          <div className="space-y-6 flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-gold" />
            <div>
              <p className="mb-3 text-lg font-medium text-alabaster tracking-widest uppercase">正在验证图片...</p>
              <p className="text-sm font-light text-pearl/60 tracking-wide">检测图片是否包含人物</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col items-center justify-center h-full">
            <div className="flex justify-center items-center w-20 h-20 rounded-full bg-white/5 border border-white/10 shadow-sm transition-transform duration-500 group-hover:scale-110">
              <ImageIcon className="w-8 h-8 text-gold" />
            </div>
            <div>
              <p className="mb-3 text-lg font-medium text-alabaster tracking-widest uppercase">点击或拖拽上传图片</p>
              <p className="text-sm font-light text-pearl/60 tracking-wide">支持 JPG, PNG, WebP 格式，最大 10MB</p>
              {user && (
                <p className="mt-4 text-xs font-light text-pearl/40 border-t border-white/10 pt-4">上传后将自动验证图片是否包含人物</p>
              )}
            </div>
          </div>
        )}
      </div>

      {user && originalImage && !isValidatingImage && (
        <div className="flex gap-3 items-start p-4 mt-6 bg-white/5 rounded-sm border border-gold/20 shadow-sm">
          <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-alabaster font-light tracking-wide">
            <p className="font-medium mb-1 uppercase tracking-widest text-xs">图片验证通过</p>
            <p className="text-pearl/60">已检测到人物，可以继续生成</p>
          </div>
        </div>
      )}
    </div>
  );
}
