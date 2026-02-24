'use client';

import { Suspense } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { useStepFlow } from '@/hooks/useStepFlow';
import { StepProgress } from './StepProgress';
import { StepDomain } from './StepDomain';
import { StepStyle } from './StepStyle';
import { StepUpload } from './StepUpload';
import { StepGenerate } from './StepGenerate';

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

  return (
    <div className="min-h-screen bg-obsidian">
      <StepProgress
        currentStep={stepIndex}
        totalSteps={totalSteps}
        stepName={state.step}
        onStepClick={stepIndex > 0 ? () => goBack() : undefined}
      />

      <div className="pt-16">
        {state.step === 'domain' && (
          <StepDomain
            onSelect={(domain) =>
              dispatch({ type: 'SELECT_DOMAIN', domain })
            }
          />
        )}

        {state.step === 'style' && (
          <StepStyle
            domain={state.domain}
            templates={templates.filter(
              (t) => t.domain === state.domain
            )}
            onSelect={(template) =>
              dispatch({ type: 'SELECT_TEMPLATE', template })
            }
            onBack={goBack}
          />
        )}

        {state.step === 'upload' && (
          <StepUpload
            template={state.template}
            photos={state.photos}
            dispatch={dispatch}
            onBack={goBack}
          />
        )}

        {(state.step === 'generate' ||
          state.step === 'result' ||
          state.step === 'error') && (
          <StepGenerate state={state} dispatch={dispatch} />
        )}
      </div>
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
