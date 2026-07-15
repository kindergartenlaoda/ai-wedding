'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  AlertTriangle,
  ArrowRight,
  Home,
  Lightbulb,
  Sparkles,
  RotateCcw,
  Heart,
  Eye,
  Download,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { StepFlowState, StepFlowAction } from '@/types/step-flow';
import { useAuth } from '@/contexts/AuthContext';
import { startGeneration } from '@/lib/generation-flow';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import FadeIn from '@/components/react-bits/animations/FadeIn';

gsap.registerPlugin(useGSAP);

type GenerateState = Extract<StepFlowState, { step: 'generate' }>;
type ResultState = Extract<StepFlowState, { step: 'result' }>;
type ErrorState = Extract<StepFlowState, { step: 'error' }>;

interface StepGenerateProps {
  state: GenerateState | ResultState | ErrorState;
  dispatch: React.Dispatch<StepFlowAction>;
}

const GENERATION_TIPS: readonly string[] = [
  'AI 正在学习您的面部特征，这需要一些时间',
  '上传不同角度和表情的照片会获得更自然的效果',
  '生成的照片可以多次重新生成，直到您满意为止',
  '平均每次生成需要 1-2 分钟，请耐心等待',
  '生成完成后可在结果页查看和下载',
  '多种风格可选：浪漫、复古、现代、艺术',
];

// SVG circular progress ring
function ProgressRing({ progress, size = 160, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/[0.06]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(200,160,100,0.9)" />
          <stop offset="100%" stopColor="rgba(200,160,100,0.4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function StepGenerate({ state, dispatch }: StepGenerateProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const [showResults, setShowResults] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const projectName = useMemo(
    () => `${state.template.name} - ${new Date().toLocaleDateString('zh-CN')}`,
    [state.template.name]
  );

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Rotate tips during generation
  useEffect(() => {
    if (state.step !== 'generate') return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GENERATION_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [state.step]);

  // Start generation flow
  useEffect(() => {
    if (state.step !== 'generate' || hasStartedRef.current) return;
    hasStartedRef.current = true;

    startGeneration(
      {
        domain: state.domain,
        template: state.template,
        photos: state.photos,
        imageCount: state.imageCount,
        additionalPrompt: state.additionalPrompt,
      },
      (progress) => {
        dispatch({
          type: 'UPDATE_PROGRESS',
          progress: progress.progress,
          progressText: progress.message,
        });
      }
    )
      .then(async (result) => {
        await refreshProfile();
        dispatch({
          type: 'COMPLETE',
          images: result.images,
          generationId: result.generationId,
        });
      })
      .catch(async (err) => {
        await refreshProfile();
        dispatch({
          type: 'FAIL',
          error: err instanceof Error ? err.message : '生成失败',
        });
      });
  }, [state, dispatch, refreshProfile]);

  // Animate result transition
  useGSAP(
    () => {
      if (state.step === 'result' && containerRef.current) {
        gsap.fromTo(
          containerRef.current,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.4,
            ease: 'power2.out',
            onComplete: () => setShowResults(true),
          }
        );
      }
    },
    { scope: containerRef, dependencies: [state.step] }
  );

  const toggleFavorite = (index: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${projectName}_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      setToast({ message: '下载成功', type: 'success' });
    } catch {
      setToast({ message: '下载失败，请重试', type: 'error' });
    }
  };

  // ─── ERROR STATE ──────────────────────────────────────────────
  if (state.step === 'error') {
    return (
      <div className="h-screen bg-obsidian flex items-center justify-center px-4 relative overflow-hidden">
        {/* Subtle template bg */}
        {state.template.preview_image_url && (
          <>
            <Image
              src={state.template.preview_image_url}
              alt=""
              fill
              className="object-cover opacity-[0.06]"
            />
            <div className="absolute inset-0 bg-obsidian/80" />
          </>
        )}

        <div className="relative z-10 text-center max-w-lg">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-2xl text-alabaster font-display mb-3 tracking-wide">
            生成遇到问题
          </h3>
          <p className="text-sm text-pearl/50 mb-4 leading-relaxed">{state.error}</p>
          <p className="text-xs text-pearl/30 mb-10">
            风格：{state.template.name}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => dispatch({ type: 'GO_BACK' })}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold text-obsidian text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors tracking-wide"
            >
              <RotateCcw className="w-4 h-4" />
              重新上传
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET' })}
              className="px-6 py-2.5 border border-white/10 text-sm text-pearl/60 rounded-sm hover:text-alabaster hover:border-white/20 hover:bg-white/5 transition-colors tracking-wide"
            >
              重新开始
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULT STATE ─────────────────────────────────────────────
  if (state.step === 'result') {
    const images = state.images;
    const generationId = state.generationId;

    return (
      <div ref={containerRef} className="h-screen bg-obsidian flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="shrink-0 px-6 lg:px-12 xl:px-20 py-5 border-b border-white/5 flex items-center justify-between bg-obsidian/95 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-medium text-alabaster tracking-wide">
                创作完成
              </h2>
              <p className="text-xs text-pearl/40">
                {state.template.name} · {images.length} 张作品
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET' })}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-sm text-xs text-pearl/50 hover:text-alabaster hover:border-white/20 hover:bg-white/5 transition-colors tracking-wider"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              再来一组
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian rounded-sm text-xs font-medium hover:bg-gold/90 transition-colors tracking-wider"
            >
              <Home className="w-3.5 h-3.5" />
              工作台
            </button>
          </div>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-6 lg:px-12 xl:px-20 py-8">
            {showResults ? (
              <>
                <div className={`grid gap-4 lg:gap-5 ${
                  images.length === 1
                    ? 'grid-cols-1 max-w-lg mx-auto'
                    : images.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {images.map((url, index) => (
                    <FadeIn key={index} delay={0.08 * index}>
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden group border border-white/5 hover:border-gold/30 transition-all duration-500 bg-obsidian shadow-lg hover:shadow-[0_0_30px_rgba(200,160,100,0.1)]">
                        <Image
                          src={url}
                          alt={`作品 ${index + 1}`}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-obsidian/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                        {/* Top-right: favorite */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => toggleFavorite(index)}
                            className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                              favorites.has(index)
                                ? 'bg-gold border-gold text-obsidian'
                                : 'bg-obsidian/50 border-white/20 text-pearl hover:text-alabaster hover:border-white/40'
                            }`}
                            aria-label="收藏"
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(index) ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        {/* Bottom bar */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-[10px] text-pearl/60 tracking-widest uppercase">
                            #{index + 1}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPreviewImageIndex(index)}
                              className="w-8 h-8 rounded-full bg-obsidian/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-pearl hover:text-alabaster hover:bg-obsidian/70 transition-colors"
                              aria-label="查看大图"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadImage(url, index)}
                              className="w-8 h-8 rounded-full bg-obsidian/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-pearl hover:text-alabaster hover:bg-obsidian/70 transition-colors"
                              aria-label="下载"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Favorite badge (persistent) */}
                        {favorites.has(index) && (
                          <div className="absolute top-3 left-3 px-2 py-1 text-[9px] font-medium tracking-widest uppercase rounded-sm backdrop-blur-md bg-gold/90 text-obsidian">
                            已收藏
                          </div>
                        )}
                      </div>
                    </FadeIn>
                  ))}
                </div>

                {/* Bottom actions */}
                <div className="mt-10 flex items-center justify-center gap-4">
                  {generationId && (
                    <button
                      onClick={() => (window.location.href = `/results/${generationId}`)}
                      className="flex items-center gap-2 px-6 py-2.5 border border-white/10 rounded-sm text-xs text-pearl/50 hover:text-alabaster hover:border-white/20 hover:bg-white/5 transition-colors tracking-wider"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      查看完整结果
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Brief celebration state */
              <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-gold" />
                  </div>
                  <p className="text-lg text-alabaster font-light tracking-[0.2em]">杰作已成</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        {previewImageIndex !== null && (
          <ImagePreviewModal
            images={images}
            initialIndex={previewImageIndex}
            isOpen={previewImageIndex !== null}
            onClose={() => setPreviewImageIndex(null)}
            onDownload={handleDownloadImage}
            projectName={projectName}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-sm bg-obsidian/95 backdrop-blur-md border border-white/10 text-sm text-alabaster shadow-2xl">
            {toast.type === 'success' ? <Check className="w-3.5 h-3.5 text-gold" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // ─── GENERATING STATE ─────────────────────────────────────────
  const progress = state.step === 'generate' ? state.progress : 0;
  const templatePreview = state.template.preview_image_url;

  return (
    <div
      ref={containerRef}
      className="h-screen bg-obsidian flex items-center justify-center relative overflow-hidden"
    >
      {/* Background: template image, deeply blurred */}
      {templatePreview && (
        <>
          <Image
            src={templatePreview}
            alt=""
            fill
            className="object-cover opacity-20 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-obsidian/60" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {/* Circular progress with template thumbnail inside */}
        <div className="relative w-40 h-40 mb-10">
          <ProgressRing progress={progress} size={160} strokeWidth={3} />
          {/* Template thumbnail centered */}
          <div className="absolute inset-3 rounded-full overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(200,160,100,0.1)]">
            {templatePreview ? (
              <Image
                src={templatePreview}
                alt={state.template.name}
                fill
                className="object-cover"
                sizes="140px"
              />
            ) : (
              <div className="w-full h-full bg-white/5" />
            )}
            <div className="absolute inset-0 bg-obsidian/30" />
          </div>
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-light text-alabaster tabular-nums drop-shadow-lg">
              {Math.round(progress)}
              <span className="text-sm text-pearl/50 ml-0.5">%</span>
            </span>
          </div>
        </div>

        {/* Status text */}
        <p className="text-base text-pearl/70 font-light tracking-wider mb-2">
          {state.step === 'generate' ? state.progressText : '准备中...'}
        </p>
        <p className="text-xs text-pearl/30 mb-8">{state.template.name}</p>

        {/* Linear progress bar */}
        <div
          className="w-full max-w-xs h-1 bg-white/[0.06] rounded-full overflow-hidden mb-10"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="生成进度"
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-gold/80 to-gold/40"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Rotating tips */}
        <div className="flex items-start gap-2.5 text-left max-w-sm">
          <Lightbulb className="w-4 h-4 text-gold/40 flex-shrink-0 mt-0.5" />
          <p
            key={tipIndex}
            className="text-xs text-pearl/40 font-light leading-relaxed animate-[fadeIn_0.5s_ease-out]"
          >
            {GENERATION_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
