'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { RefreshCw, ArrowRight, Home, Lightbulb } from 'lucide-react';
import type { StepFlowState, StepFlowAction, PROGRESS_TEXTS } from '@/types/step-flow';
import { ScanningLine, SuccessBadge } from '@/components/shared-animations';
import { GenerationResults } from '@/components/GenerationResults';
import { parseImageFromContent } from '@/lib/image-stream';
import { useAuth } from '@/contexts/AuthContext';

gsap.registerPlugin(useGSAP);

type GenerateState = Extract<StepFlowState, { step: 'generate' }>;
type ResultState = Extract<StepFlowState, { step: 'result' }>;
type ErrorState = Extract<StepFlowState, { step: 'error' }>;

interface StepGenerateProps {
  state: GenerateState | ResultState | ErrorState;
  dispatch: React.Dispatch<StepFlowAction>;
}

const PROGRESS_TEXT_LIST: readonly string[] = [
  '正在雕琢光影...',
  'AI 解析面部特征中...',
  '构筑视觉叙事...',
  '渲染最终画面...',
] satisfies typeof PROGRESS_TEXTS;

const GENERATION_TIPS: readonly string[] = [
  'AI 正在学习您的面部特征，这需要一些时间',
  '上传不同角度和表情的照片会获得更自然的效果',
  '生成的照片可以多次重新生成，直到您满意为止',
  '平均每次生成需要 1-2 分钟，请耐心等待',
  '生成完成后可在结果页查看和下载',
  '多种风格可选：浪漫、复古、现代、艺术',
];

export function StepGenerate({ state, dispatch }: StepGenerateProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const [showResults, setShowResults] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate tips during generation
  useEffect(() => {
    if (state.step !== 'generate') return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GENERATION_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [state.step]);

  useEffect(() => {
    if (state.step !== 'generate' || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const runGeneration = async () => {
      try {
        // Freeze credits before generation to prevent concurrent overspend
        const freezeRes = await fetch('/api/credits/freeze', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: state.template.price_credits }),
        });

        if (!freezeRes.ok) {
          const freezeData: { error?: string } = await freezeRes.json().catch(() => ({}));
          throw new Error(freezeData.error || '积分不足，无法开始生成');
        }

        const photoUrls = state.photos
          .map((p) => p.minioUrl)
          .filter(Boolean);

        const promptConfig = state.template.prompt_config;
        const prompts = state.template.prompt_list?.length
          ? state.template.prompt_list
          : [promptConfig.basePrompt];

        let progressIdx = 0;
        const progressInterval = setInterval(() => {
          progressIdx = Math.min(progressIdx + 1, PROGRESS_TEXT_LIST.length - 1);
          const progress = Math.min(
            ((progressIdx + 1) / PROGRESS_TEXT_LIST.length) * 80,
            80
          );
          dispatch({
            type: 'UPDATE_PROGRESS',
            progress,
            progressText: PROGRESS_TEXT_LIST[progressIdx],
          });
        }, 3000);

        const res = await fetch('/api/projects', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${state.template.name} - ${new Date().toLocaleDateString('zh-CN')}`,
            domain: state.domain,
            uploaded_photos: photoUrls,
          }),
        });

        if (!res.ok) throw new Error('创建项目失败');
        const project: { id: string } = await res.json();

        const genRes = await fetch('/api/generations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            template_id: state.template.id,
            domain: state.domain,
            credits_used: state.template.price_credits,
          }),
        });

        if (!genRes.ok) throw new Error('创建生成记录失败');
        const generation: { id: string } = await genRes.json();

        const allImages: string[] = [];
        for (const prompt of prompts) {
          const streamRes = await fetch('/api/generate-stream', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              image_inputs: photoUrls,
            }),
          });

          if (!streamRes.ok || !streamRes.body) {
            continue;
          }

          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = '';
          let content = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (sseBuffer.trim().length > 0) sseBuffer += '\n\n';
            } else {
              sseBuffer += decoder.decode(value, { stream: true });
            }

            const events = sseBuffer.split(/\n\n/);
            sseBuffer = events.pop() || '';

            for (const evt of events) {
              const dataLines = evt
                .split(/\n/)
                .filter((l: string) => l.startsWith('data:'))
                .map((l: string) => l.slice(5).trimStart());
              if (dataLines.length === 0) continue;
              const dataPayload = dataLines.join('\n').trim();
              if (dataPayload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataPayload) as {
                  choices?: Array<{
                    delta?: { content?: string };
                    finish_reason?: string | null;
                  }>;
                };
                if (parsed.choices?.[0]?.delta?.content) {
                  content += parsed.choices[0].delta.content;
                }
              } catch {
                // skip unparseable
              }
            }
            if (done) break;
          }

          const { imageData, imageUrl: parsedUrl } = parseImageFromContent(content);

          if (imageData) {
            let imageUrl = imageData.dataUrl;

            try {
              const uploadRes = await fetch('/api/upload-image', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image: imageUrl,
                  folder: `generations/${generation.id}/previews`,
                }),
              });
              if (uploadRes.ok) {
                const payload: { presignedUrl?: string; url?: string } =
                  await uploadRes.json();
                imageUrl = payload.presignedUrl || payload.url || imageUrl;
              }
            } catch {
              // fallback to dataUrl
            }

            allImages.push(imageUrl);
          } else if (parsedUrl) {
            // AI 返回了远程 URL，直接使用
            allImages.push(parsedUrl);
          }
        }

        clearInterval(progressInterval);

        if (allImages.length === 0) {
          throw new Error('未能生成任何图片');
        }

        await fetch(`/api/generations/${generation.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            preview_images: allImages,
          }),
        });

        await fetch('/api/credits/deduct', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: state.template.price_credits }),
        });

        await refreshProfile();

        dispatch({
          type: 'COMPLETE',
          images: allImages,
          generationId: generation.id,
        });
      } catch (err) {
        await fetch('/api/credits/unfreeze', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: state.template.price_credits }),
        }).catch(() => { });

        await refreshProfile();

        dispatch({
          type: 'FAIL',
          error: err instanceof Error ? err.message : '生成失败',
        });
      }
    };

    runGeneration();
  }, [state, dispatch, refreshProfile]);

  useGSAP(
    () => {
      if (state.step === 'generate' && scanLineRef.current) {
        gsap.fromTo(
          scanLineRef.current,
          { top: '0%', autoAlpha: 1 },
          {
            top: '100%',
            duration: 8,
            ease: 'power1.inOut',
            repeat: -1,
          }
        );
      }

      if (state.step === 'result' && badgeRef.current) {
        gsap.fromTo(
          badgeRef.current,
          { autoAlpha: 0, scale: 0.9 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(2)',
            onComplete: () => {
              setTimeout(() => setShowResults(true), 1500);
            },
          }
        );
      }
    },
    { scope: containerRef, dependencies: [state.step] }
  );

  if (state.step === 'error') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-obsidian flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-xl text-alabaster font-display mb-3">
            生成遇到问题
          </h3>
          <p className="text-sm text-pearl/60 mb-8">{state.error}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'GO_BACK' })}
            className="px-6 py-2.5 bg-gold text-obsidian text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors"
          >
            重新上传
          </button>
        </div>
      </div>
    );
  }

  if (state.step === 'result' && showResults) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-obsidian py-12 px-4">
        <GenerationResults
          images={state.images}
          generationId={state.generationId}
          projectName={`${state.template.name} - ${new Date().toLocaleDateString('zh-CN')}`}
          onNavigateToDashboard={() => router.push('/dashboard')}
        />
        <div className="max-w-3xl mx-auto mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex items-center gap-2 px-5 py-2.5 border border-white/10 rounded-sm text-sm text-pearl/60 hover:text-alabaster hover:border-white/20 hover:bg-white/5 transition-colors uppercase tracking-widest"
          >
            <ArrowRight className="w-4 h-4" />
            再创作一组
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian rounded-sm text-sm hover:shadow-[0_0_15px_rgba(200,160,100,0.4)] transition-all duration-300 font-medium uppercase tracking-widest"
          >
            <Home className="w-4 h-4" />
            返回工作台
          </button>
        </div>
      </div>
    );
  }

  const bgPhoto =
    state.step === 'generate' && state.photos.length > 0
      ? state.photos[0].dataUrl
      : undefined;

  return (
    <div
      ref={containerRef}
      className="min-h-[calc(100vh-4rem)] bg-obsidian flex items-center justify-center relative overflow-hidden"
    >
      {bgPhoto && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bgPhoto})`,
            filter: 'blur(20px) brightness(0.3)',
          }}
        />
      )}

      <div className="relative z-10 text-center">
        <div className="relative w-72 h-72 mx-auto mb-8">
          <ScanningLine ref={scanLineRef} />
        </div>

        <p className="text-lg text-pearl/80 font-light tracking-wider mb-3">
          {state.step === 'generate' ? state.progressText : '杰作已成'}
        </p>

        {state.step === 'generate' && (
          <div
            className="w-48 mx-auto h-1 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(state.progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="生成进度"
          >
            <div
              className="h-full bg-gold/60 rounded-full transition-all duration-1000"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}

        {state.step === 'generate' && (
          <div className="mt-8 flex items-start gap-2.5 max-w-xs mx-auto text-left">
            <Lightbulb className="w-4 h-4 text-gold/60 flex-shrink-0 mt-0.5" />
            <p
              key={tipIndex}
              className="text-xs text-pearl/50 font-light leading-relaxed"
            >
              {GENERATION_TIPS[tipIndex]}
            </p>
          </div>
        )}
      </div>

      {state.step === 'result' && !showResults && (
        <SuccessBadge ref={badgeRef} />
      )}
    </div>
  );
}
