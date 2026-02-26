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
  requireFaceDetection: boolean;
}

const MAX_PHOTOS = 6;

export function StepUpload({
  template,
  photos,
  dispatch,
  requireFaceDetection,
}: StepUploadProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 生成数量选择
  const maxImages = template.prompt_list?.length || 1;

  // 从 localStorage 读取用户上次选择的数量
  const [imageCount, setImageCount] = useState(() => {
    if (typeof window === 'undefined') return Math.min(1, maxImages);
    try {
      const saved = localStorage.getItem('preferred_image_count');
      if (saved) {
        const count = Number(saved);
        // 确保不超过当前模板的最大数量
        return Math.min(count, maxImages);
      }
    } catch {
      // localStorage 不可用时忽略
    }
    return Math.min(1, maxImages);
  });

  // 保存用户选择到 localStorage
  const handleImageCountChange = useCallback((count: number) => {
    setImageCount(count);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('preferred_image_count', count.toString());
      } catch {
        // localStorage 不可用时忽略
      }
    }
  }, []);

  // 计算批量折扣后的单价
  const getUnitPrice = useCallback((count: number): number => {
    if (count >= 4) return Math.floor(template.price_credits * 0.8);  // 8折
    if (count >= 3) return Math.floor(template.price_credits * 0.9);  // 9折
    return template.price_credits;
  }, [template.price_credits]);

  // 计算总积分（应用折扣）
  const unitPrice = getUnitPrice(imageCount);
  const totalCredits = unitPrice * imageCount;
  const originalTotal = template.price_credits * imageCount;
  const discount = originalTotal - totalCredits;
  const hasDiscount = discount > 0;

  const { handleFiles, removePhoto } = useParallelPhotoUpload({
    maxPhotos: MAX_PHOTOS,
    dispatch,
    currentPhotos: photos,
    requireFaceDetection,
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
      // 如果需要人脸识别且未登录，提示先登录
      if (requireFaceDetection && !user) {
        setShowAuthModal(true);
        return;
      }
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles, requireFaceDetection, user]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        // 如果需要人脸识别且未登录，提示先登录
        if (requireFaceDetection && !user) {
          setShowAuthModal(true);
          e.target.value = '';
          return;
        }
        handleFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [handleFiles, requireFaceDetection, user]
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

    // 计算总积分（应用折扣）
    const userCredits = profile?.credits ?? 0;

    if (userCredits < totalCredits) {
      router.push('/pricing');
      return;
    }

    setFreezing(true);
    try {
      const res = await fetch('/api/credits/freeze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalCredits }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error || '系统繁忙，请稍后重试');
      }

      dispatch({
        type: 'START_GENERATE',
        photos: validPhotos,
        imageCount,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '冻结积分失败');
    } finally {
      setFreezing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Guest login prompt */}
      {!user && (
        <div className="mb-6 p-4 rounded-sm border border-gold/20 bg-gold/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0" />
            <p className="text-sm text-pearl/80 font-light">
              <span className="font-medium text-alabaster">登录后</span>可保存作品、获得 50 免费积分
            </p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-gold text-obsidian rounded-sm text-xs font-medium tracking-widest uppercase hover:bg-gold/90 transition-colors flex-shrink-0"
          >
            立即登录
          </button>
        </div>
      )}

      <div className="flex gap-8 lg:gap-12 xl:gap-16">

        {/* LEFT COLUMN: Template Preview + Guidelines */}
        <div className="hidden lg:flex flex-col w-[320px] xl:w-[360px] shrink-0 gap-6">
          {/* Template Preview Card */}
          <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)] border border-white/10">
            {template.preview_image_url ? (
              <img
                src={template.preview_image_url}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-stone/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-xs text-pearl/50 tracking-widest uppercase mb-1">当前风格</p>
              <h3 className="text-base font-medium text-alabaster">{template.name}</h3>
            </div>
          </div>

          {/* Photo Guidelines */}
          <div className="flex flex-col p-5 rounded-lg border bg-white/[0.03] border-white/10">
            <h3 className="flex gap-2 items-center mb-4 text-xs font-medium text-pearl/70 tracking-wide uppercase">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> 拍照建议
            </h3>
            <ul className="space-y-3">
              <li className="flex gap-2.5 items-start text-xs text-pearl/60 leading-relaxed">
                <CheckCircle className="w-3 h-3 text-emerald-400/70 mt-0.5 flex-shrink-0" />
                <span>光线充足，面部清晰可见</span>
              </li>
              <li className="flex gap-2.5 items-start text-xs text-pearl/60 leading-relaxed">
                <CheckCircle className="w-3 h-3 text-emerald-400/70 mt-0.5 flex-shrink-0" />
                <span>正面免冠，五官无遮挡</span>
              </li>
              <li className="flex gap-2.5 items-start text-xs text-pearl/60 leading-relaxed">
                <CheckCircle className="w-3 h-3 text-emerald-400/70 mt-0.5 flex-shrink-0" />
                <span>单人近照，背景干净</span>
              </li>
              <li className="flex gap-2.5 items-start text-xs text-pearl/60 leading-relaxed">
                <X className="w-3 h-3 text-red-400/70 mt-0.5 flex-shrink-0" />
                <span>避免美颜、模糊、合照</span>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Upload + Photos + Controls */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Upload Zone */}
          <div
            className="group flex flex-col justify-center items-center p-10 lg:p-12 text-center rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer border-white/15 hover:border-gold/50 hover:bg-gold/[0.03] mb-6"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 rounded-full bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-gold/10 transition-colors">
              <Upload className="w-6 h-6 text-pearl/40 group-hover:text-gold/70 transition-colors" />
            </div>
            <p className="mb-1 text-sm text-pearl/80">
              拖拽照片到此处，或点击上传
            </p>
            <p className="text-xs text-pearl/40">
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

          {/* Mobile-only Guidelines (hidden on lg+) */}
          {photos.length === 0 && (
            <div className="flex lg:hidden flex-col p-5 rounded-lg border bg-white/[0.03] border-white/10 mb-6">
              <h3 className="flex gap-2 items-center mb-3 text-xs font-medium text-pearl/70">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> 拍照建议
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-pearl/60">
                <span className="flex gap-1.5 items-center"><CheckCircle className="w-3 h-3 text-emerald-400/70 flex-shrink-0" />光线充足</span>
                <span className="flex gap-1.5 items-center"><CheckCircle className="w-3 h-3 text-emerald-400/70 flex-shrink-0" />正面免冠</span>
                <span className="flex gap-1.5 items-center"><CheckCircle className="w-3 h-3 text-emerald-400/70 flex-shrink-0" />单人近照</span>
                <span className="flex gap-1.5 items-center"><X className="w-3 h-3 text-red-400/70 flex-shrink-0" />避免美颜</span>
              </div>
            </div>
          )}

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden relative rounded-lg aspect-square bg-white/5 group/photo"
                >
                  <img
                    src={photo.dataUrl}
                    alt="uploaded"
                    className="object-cover w-full h-full"
                  />

                  {(photo.uploadStatus === 'uploading' ||
                    photo.identifyStatus === 'pending' ||
                    photo.identifyStatus === 'identifying') && (
                      <div className="flex absolute inset-0 justify-center items-center bg-obsidian/40">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}

                  {photo.identifyStatus === 'valid' &&
                    photo.uploadStatus === 'uploaded' && (
                      <div className="absolute top-1.5 left-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400 drop-shadow" />
                      </div>
                    )}

                  {photo.identifyStatus === 'invalid' && (
                    <div className="flex absolute inset-0 flex-col justify-center items-center p-2 bg-red-900/50">
                      <AlertCircle className="mb-1 w-4 h-4 text-red-300" />
                      <span className="text-[10px] text-red-200 text-center leading-tight">
                        {photo.identifyDescription || '未检测到人物'}
                      </span>
                    </div>
                  )}

                  {photo.identifyStatus === 'error' && (
                    <div className="absolute top-1.5 left-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 drop-shadow" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full transition-all bg-obsidian/60 text-white/70 hover:bg-obsidian/80 opacity-0 group-hover/photo:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add more photos slot */}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border border-dashed border-white/15 hover:border-gold/40 flex items-center justify-center transition-colors hover:bg-gold/[0.03]"
                >
                  <span className="text-2xl text-pearl/30 font-light">+</span>
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex gap-2 items-center p-3 mb-4 rounded-lg border bg-red-500/10 border-red-500/20">
              <AlertCircle className="flex-shrink-0 w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{errorMsg}</span>
            </div>
          )}

          {/* Generation Count Selector */}
          {maxImages > 1 && validPhotos.length > 0 && (
            <div className="p-5 mb-6 rounded-lg border bg-white/[0.03] border-white/10">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-medium text-alabaster">
                  生成数量
                </label>
                <span className="text-lg font-semibold text-gold">
                  {imageCount} 张
                </span>
              </div>

              <input
                type="range"
                min="1"
                max={maxImages}
                value={imageCount}
                onChange={(e) => handleImageCountChange(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gold [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />

              <div className="flex justify-between items-center mt-3 text-xs">
                <span className="text-pearl/50">1 张</span>
                <span className="text-pearl/50">{maxImages} 张</span>
              </div>

              {template.prompt_list && template.prompt_list.length > 1 && (
                <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="mb-2 text-xs text-pearl/60">包含风格：</p>
                  <div className="flex flex-wrap gap-2">
                    {template.prompt_list.slice(0, imageCount).map((_, index) => (
                      <span
                        key={index}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs rounded border bg-gold/10 border-gold/30 text-gold"
                      >
                        <CheckCircle className="w-3 h-3" />
                        风格 {index + 1}
                      </span>
                    ))}
                    {imageCount < template.prompt_list.length && (
                      <span className="inline-flex gap-1 items-center px-2 py-1 text-xs rounded border bg-white/5 border-white/10 text-pearl/40">
                        +{template.prompt_list.length - imageCount} 个未选
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 mt-4 border-t border-white/10">
                {hasDiscount && (
                  <div className="flex gap-2 items-center mb-3 text-xs">
                    <span className="px-2 py-1 font-medium text-emerald-400 rounded border bg-emerald-500/10 border-emerald-500/30">
                      批量优惠 -{discount} 积分
                    </span>
                    <span className="line-through text-pearl/50">
                      原价 {originalTotal} 积分
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-pearl/60">
                    <span className="text-pearl/80">单价：</span>
                    {unitPrice} 积分/张
                    {hasDiscount && (
                      <span className="ml-1 text-emerald-400">
                        ({imageCount >= 4 ? '8折' : '9折'})
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-pearl/60">共需：</span>
                    <span className="ml-1 font-semibold text-gold">
                      {totalCredits} 积分
                    </span>
                  </div>
                </div>

                {!hasDiscount && imageCount < 3 && maxImages >= 3 && (
                  <p className="mt-2 text-xs text-pearl/50">
                    💡 生成 3 张享 9 折，4 张享 8 折
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 mt-2 w-full border-t border-white/5">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-pearl/50">
                {validPhotos.length} 张就绪
                {isProcessing && (
                  <span className="ml-2 text-amber-500">
                    ({processingPhotos.length} 处理中)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleStartGenerate}
                disabled={
                  validPhotos.length === 0 || freezing || isProcessing
                }
                className="px-8 py-2.5 bg-gold text-obsidian text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors tracking-wide disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {freezing && <Loader2 className="w-4 h-4 animate-spin" />}
                开始创作
              </button>
            </div>
          </div>

        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
