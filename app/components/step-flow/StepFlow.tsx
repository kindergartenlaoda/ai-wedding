'use client';

import { Suspense, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTemplates } from '@/hooks/useTemplates';
import { useDomains } from '@/hooks/useDomains';
import { getDomainCoverImage } from '@/lib/domain-fallbacks';
import type { Domain } from '@/hooks/useDomains';
import type { StepFlowState, StepFlowAction, PhotoState } from '@/types/step-flow';
import { useStepFlow } from '@/hooks/useStepFlow';
import { StepDomain } from './StepDomain';
import { StepStyle } from './StepStyle';
import { StepUpload } from './StepUpload';
import { StepGenerate } from './StepGenerate';


gsap.registerPlugin(useGSAP);

function MainCanvas({ state, isFullScreenStep, dispatch, domains }: { state: StepFlowState, isFullScreenStep: boolean, dispatch: React.Dispatch<StepFlowAction>, domains: Domain[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDomain = domains.find((d) => d.slug === state.domain);
  const firstDomainSlug = domains[0]?.slug || 'wedding';

  useGSAP(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, { dependencies: [state.step, state.domain, 'template' in state ? state.template?.id : undefined], scope: containerRef });

  if (state.step === 'domain') {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <Image
          src={getDomainCoverImage(domains[0]?.cover_image, firstDomainSlug)}
          alt="Domain Preview"
          fill
          className="object-cover opacity-30 mix-blend-luminosity"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/60 to-transparent" />
        <div className="absolute inset-y-0 left-12 xl:left-24 flex flex-col justify-center max-w-xl text-left">
          <h2 className="text-5xl lg:text-7xl font-display text-alabaster tracking-tight mb-8 leading-[1.1]">
            Your Masterpiece <br />
            <span className="text-gold italic font-serif mt-2 block">Awaits</span>
          </h2>
          <p className="text-lg text-pearl/60 font-light leading-relaxed">
            Select a domain to begin shaping your vision. Our AI understands the nuances of cinematic lighting, artistic composition, and professional photography.
          </p>
        </div>
      </div>
    );
  }

  if (state.step === 'style') {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <Image
          src={getDomainCoverImage(currentDomain?.cover_image, state.domain)}
          alt="Style Preview"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-obsidian/20 backdrop-blur-[2px]" />
      </div>
    );
  }

  if (state.step === 'upload') {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <Image
          src={state.template?.preview_image_url || getDomainCoverImage(currentDomain?.cover_image, state.domain)}
          alt="Template Preview"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-obsidian/40 backdrop-blur-md" />

        {state.photos && state.photos.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-xl p-8">
              {state.photos.map((p: PhotoState) => (
                <div key={p.id} className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden border-[3px] border-gold/40 shadow-[0_0_30px_rgba(200,160,100,0.15)] bg-obsidian/50">
                  <img src={p.dataUrl} className="w-full h-full object-cover" alt="Photo Uploaded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.05)] bg-obsidian/20 backdrop-blur-sm">
              <span className="text-gold flex items-center justify-center w-full h-full opacity-60 text-4xl font-light hover:scale-110 transition-transform duration-700">+</span>
            </div>
            <p className="text-pearl/80 tracking-[0.2em] font-medium text-sm drop-shadow-md">期待您的面容加入杰作</p>
          </div>
        )}
      </div>
    );
  }

  if (isFullScreenStep) {
    if (state.step === 'generate' || state.step === 'result' || state.step === 'error') {
      return (
        <div ref={containerRef} className="absolute inset-0">
          <StepGenerate state={state} dispatch={dispatch} />
        </div>
      );
    }
  }

  return null;
}

function StepFlowInner() {
  const { templates, loading: templatesLoading } = useTemplates();
  const { domains, loading: domainsLoading } = useDomains();
  const { state, dispatch, goBack, stepIndex } = useStepFlow({
    templates,
  });

  const loading = templatesLoading || domainsLoading;
  const currentDomain = domains.find((d) => d.slug === state.domain);

  if (loading) {
    return (
      <div className="h-screen w-full bg-obsidian flex font-sans overflow-hidden">
        {/* LEFT PANE: MAIN CANVAS */}
        <div className="flex-1 relative bg-stone/5">
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        </div>

        {/* RIGHT PANE: CONTROL PANEL */}
        <div className="w-[400px] xl:w-[450px] h-screen bg-obsidian/95 border-l border-white/5 shadow-2xl p-8 flex flex-col z-20">
          <div className="w-32 h-4 bg-white/5 rounded-full mb-12 animate-pulse mt-8" />
          <div className="w-48 h-8 bg-white/5 rounded-md mb-12 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-white/5 rounded-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isFullScreenStep = state.step === 'generate' || state.step === 'result' || state.step === 'error';
  const isExpandedStep = state.step === 'style' || state.step === 'upload';
  const showLeftPane = !isFullScreenStep && !isExpandedStep;

  return (
    <div className="h-screen w-full bg-obsidian flex font-sans overflow-hidden">

      {/* LEFT PANE: MAIN CANVAS */}
      {showLeftPane && (
        <div className={`flex-1 relative transition-all duration-700 ease-in-out bg-stone/5 ${isFullScreenStep ? 'w-full' : ''}`}>
          <MainCanvas state={state} isFullScreenStep={isFullScreenStep} dispatch={dispatch} domains={domains} />
        </div>
      )}

      {/* FULL-SCREEN STEP (generate / result / error) */}
      {isFullScreenStep && (
        <div className="flex-1 relative bg-stone/5">
          <MainCanvas state={state} isFullScreenStep={isFullScreenStep} dispatch={dispatch} domains={domains} />
        </div>
      )}

      {/* RIGHT PANE: CONTROL PANEL */}
      {!isFullScreenStep && (
        <div className={`h-screen flex flex-col bg-obsidian/95 backdrop-blur-2xl border-l border-white/5 z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ${isExpandedStep ? 'w-full border-l-0 shadow-none' : 'w-[400px] xl:w-[450px]'}`}>

          <div className="flex-1 overflow-y-auto no-scrollbar relative">
            <div className={`sticky top-0 z-50 bg-obsidian/90 backdrop-blur-md pt-8 pb-4 border-b border-white/5 w-full flex justify-between items-center ${isExpandedStep ? 'px-8 lg:px-16 xl:px-24' : 'px-6'}`}>
              <h2 className="text-sm font-medium tracking-widest text-pearl/50 uppercase">
                {state.step === 'domain' && '1. 选择领域'}
                {state.step === 'style' && '2. 创作风格'}
                {state.step === 'upload' && '3. 上传照片'}
              </h2>
              {stepIndex > 0 && (
                <button onClick={goBack} className="text-xs text-pearl/40 hover:text-alabaster transition-colors">
                  &larr; 返回
                </button>
              )}
            </div>

            <div className={`py-6 pb-32 ${isExpandedStep ? 'px-8 lg:px-16 xl:px-24' : 'px-6'}`}>
              {state.step === 'domain' && (
                <StepDomain
                  onSelect={(domain) => dispatch({ type: 'SELECT_DOMAIN', domain })}
                />
              )}

              {state.step === 'style' && (
                <StepStyle
                  domain={state.domain}
                  templates={templates.filter((t) => t.domain === state.domain)}
                  onSelect={(template) => dispatch({ type: 'SELECT_TEMPLATE', template })}
                  onBack={goBack}
                  fullWidth
                />
              )}

              {state.step === 'upload' && (
                <StepUpload
                  template={state.template!}
                  photos={state.photos}
                  dispatch={dispatch}
                  onBack={goBack}
                  requireFaceDetection={currentDomain?.require_face_detection ?? false}
                />
              )}
            </div>
          </div>

          {/* FUTURE ACTION BAR GOES HERE */}

        </div>
      )}
    </div>
  );
}

export function StepFlow() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-obsidian flex items-center justify-center">
          <span className="text-pearl/40 text-sm tracking-widest">
            loading...
          </span>
        </div>
      }
    >
      <StepFlowInner />
    </Suspense>
  );
}
