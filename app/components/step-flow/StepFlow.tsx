'use client';

import { Suspense, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTemplates } from '@/hooks/useTemplates';
import { useStepFlow } from '@/hooks/useStepFlow';
import { StepProgress } from './StepProgress';
import { StepDomain } from './StepDomain';
import { StepStyle } from './StepStyle';
import { StepUpload } from './StepUpload';
import { StepGenerate } from './StepGenerate';
import { DOMAIN_CONFIG } from '@/types/domain';

gsap.registerPlugin(useGSAP);

function RightPanePreview({ state }: { state: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, { dependencies: [state.step, state.domain, state.template?.id], scope: containerRef });

  if (state.step === 'domain') {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop"
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
          src={state.template?.preview_image_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2000&auto=format&fit=crop"}
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
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center bg-obsidian">
        {state.photos && state.photos.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-12 w-full max-w-5xl opacity-40">
            {state.photos.map((p: any) => (
              <div key={p.id} className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-2xl">
                <img src={p.dataUrl} className="w-full h-full object-cover filter grayscale sepia-[0.3]" alt="Photo Uploaded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(255,255,255,0.02)]">
              <span className="text-gold opacity-30 text-5xl font-light hover:scale-110 transition-transform duration-700">+</span>
            </div>
            <p className="text-pearl/40 tracking-[0.3em] uppercase text-xs">Waiting for subjects</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function StepFlowInner() {
  const { templates, loading } = useTemplates();
  const { state, dispatch, goBack, stepIndex, totalSteps } = useStepFlow({
    templates,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="flex items-center gap-3 text-pearl/60">
          <span className="w-3 h-3 rounded-full bg-gold animate-pulse" />
          <span className="text-sm tracking-widest uppercase">加载中...</span>
        </div>
      </div>
    );
  }

  const isFullScreenStep = state.step === 'generate' || state.step === 'result' || state.step === 'error';

  return (
    <div className="min-h-screen bg-obsidian flex flex-col lg:flex-row w-full font-sans">

      {/* LEFT PANE / FULLSCREEN */}
      <div className={`w-full transition-all duration-700 ease-in-out z-20 flex flex-col ${isFullScreenStep
          ? 'lg:w-full lg:h-screen'
          : 'lg:w-[450px] xl:w-[500px] lg:h-screen lg:fixed lg:left-0 lg:top-0 lg:border-r border-white/5 bg-obsidian/95 backdrop-blur-2xl shadow-2xl'
        }`}>

        {!isFullScreenStep && (
          <div className="sticky lg:relative top-0 z-50 bg-obsidian/80 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b lg:border-none border-white/5 pt-16 lg:pt-8 w-full">
            <StepProgress
              currentStep={stepIndex}
              totalSteps={totalSteps}
              stepName={state.step}
              onStepClick={stepIndex > 0 ? () => goBack() : undefined}
            />
          </div>
        )}

        <div className={`flex-1 w-full ${isFullScreenStep ? '' : 'overflow-y-auto no-scrollbar pb-32 lg:pb-0'}`}>
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
            />
          )}

          {state.step === 'upload' && (
            <StepUpload
              template={state.template!}
              photos={state.photos}
              dispatch={dispatch}
              onBack={goBack}
            />
          )}

          {isFullScreenStep && (
            <StepGenerate state={state as any} dispatch={dispatch} />
          )}
        </div>
      </div>

      {/* RIGHT PANE */}
      {!isFullScreenStep && (
        <div className="hidden lg:block lg:fixed lg:left-[450px] xl:left-[500px] lg:right-0 lg:top-0 lg:bottom-0 bg-stone/5 overflow-hidden">
          <RightPanePreview state={state} />
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
