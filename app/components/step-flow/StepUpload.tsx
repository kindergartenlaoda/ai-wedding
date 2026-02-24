'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import type { Template } from '@/types/database';
import type { PhotoState, StepFlowAction, ValidatedPhoto } from '@/types/step-flow';
import { useAuth } from '@/contexts/AuthContext';
import { useParallelPhotoUpload } from '@/hooks/useParallelPhotoUpload';
import { AuthModal } from '@/components/AuthModal';

interface StepUploadProps {
  template: Template;
  photos: PhotoState[];
  dispatch: React.Dispatch<StepFlowAction>;
  onBack: () => void;
}

const MAX_PHOTOS = 6;

export function StepUpload({
  template,
  photos,
  dispatch,
  onBack,
}: StepUploadProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { handleFiles, removePhoto } = useParallelPhotoUpload({
    maxPhotos: MAX_PHOTOS,
    dispatch,
    currentPhotos: photos,
  });

  const validPhotos = photos.filter(
    (p): p is ValidatedPhoto =>
      p.identifyStatus === 'valid' && p.uploadStatus === 'uploaded' && !!p.minioUrl
  );
  const invalidPhotos = photos.filter((p) => p.identifyStatus === 'invalid');
  const processingPhotos = photos.filter(
    (p) =>
      p.uploadStatus === 'uploading' ||
      p.identifyStatus === 'pending' ||
      p.identifyStatus === 'identifying'
  );
  const isProcessing = processingPhotos.length > 0;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const handleStartGenerate = async () => {
    setErrorMsg(null);

    if (validPhotos.length === 0) {
      setErrorMsg('请至少上传 1 张有效照片');
      return;
    }
    if (invalidPhotos.length > 0) {
      setErrorMsg('请先删除无效照片（未检测到人物）');
      return;
    }
    if (isProcessing) {
      setErrorMsg('部分照片还在处理中，请稍候');
      return;
    }
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const userCredits = profile?.credits ?? 0;
    if (userCredits < template.price_credits) {
      router.push('/pricing');
      return;
    }

    setFreezing(true);
    try {
      const res = await fetch('/api/credits/freeze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: template.price_credits }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error || '系统繁忙，请稍后重试');
      }

      dispatch({ type: 'START_GENERATE', photos: validPhotos });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '冻结积分失败');
    } finally {
      setFreezing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-alabaster">
      <div className="flex-1 px-4 py-8 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-10">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full border border-stone/20 text-stone/60 hover:text-obsidian hover:border-stone/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xs font-medium tracking-[0.3em] text-stone/50 uppercase mb-1">
              Step 03 &middot; {template.name}
            </h2>
            <p className="text-2xl md:text-3xl font-display text-obsidian tracking-tight">
              上传您的照片
            </p>
          </div>
        </div>

        <div
          className="border-2 border-dashed border-stone/20 rounded-xl p-12 text-center cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-colors mb-6"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 text-stone/30 mx-auto mb-4" />
          <p className="text-sm text-stone/60 mb-1">
            拖拽照片到此处，或点击上传
          </p>
          <p className="text-xs text-stone/40">
            支持 JPG / PNG，最多 {MAX_PHOTOS} 张
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-stone/5"
              >
                <img
                  src={photo.dataUrl}
                  alt="uploaded"
                  className="w-full h-full object-cover"
                />

                {(photo.uploadStatus === 'uploading' ||
                  photo.identifyStatus === 'pending' ||
                  photo.identifyStatus === 'identifying') && (
                  <div className="absolute inset-0 bg-obsidian/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                {photo.identifyStatus === 'valid' &&
                  photo.uploadStatus === 'uploaded' && (
                    <div className="absolute top-2 left-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow" />
                    </div>
                  )}

                {photo.identifyStatus === 'invalid' && (
                  <div className="absolute inset-0 bg-red-900/50 flex flex-col items-center justify-center p-2">
                    <AlertCircle className="w-5 h-5 text-red-300 mb-1" />
                    <span className="text-[10px] text-red-200 text-center leading-tight">
                      {photo.identifyDescription || '未检测到人物'}
                    </span>
                  </div>
                )}

                {photo.identifyStatus === 'error' && (
                  <div className="absolute top-2 left-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 drop-shadow" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-obsidian/60 text-white/80 hover:bg-obsidian/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{errorMsg}</span>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-stone/10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-stone/60">
            {validPhotos.length} 张照片就绪
            {isProcessing && (
              <span className="ml-2 text-amber-600">
                ({processingPhotos.length} 张处理中)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleStartGenerate}
            disabled={
              validPhotos.length === 0 || freezing || isProcessing
            }
            className="px-6 py-2.5 bg-gold text-obsidian text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors tracking-wide disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {freezing && <Loader2 className="w-4 h-4 animate-spin" />}
            开始创作
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
