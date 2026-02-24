'use client';

import type { StepName } from '@/types/step-flow';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepName: StepName;
  onStepClick?: (step: number) => void;
}

const STEP_LABELS = ['选择领域', '选择风格', '上传照片', '生成作品'];

export function StepProgress({
  currentStep,
  totalSteps,
  onStepClick,
}: StepProgressProps) {
  const isGenerating =
    currentStep === 3;

  return (
    <div
      className={`fixed lg:static top-0 left-0 right-0 z-50 backdrop-blur-md lg:backdrop-blur-none border-b lg:border-b-0 transition-colors duration-500 ${isGenerating
          ? 'bg-obsidian/90 border-white/5'
          : 'bg-obsidian/80 border-white/5'
        }`}
    >
      <div className="w-full mx-auto px-6 py-4 flex items-center gap-3">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          const isClickable = isCompleted && !!onStepClick;

          return (
            <div key={i} className="flex items-center gap-3 flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(i)}
                className={`flex items-center gap-2 text-xs tracking-[0.15em] uppercase transition-colors duration-300 ${isActive
                    ? 'text-gold font-medium'
                    : isCompleted
                      ? 'text-pearl/60 cursor-pointer hover:text-pearl'
                      : 'text-pearl/20'
                  } ${!isClickable ? 'cursor-default' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-colors duration-300 ${isActive
                      ? 'border-gold bg-gold/10 text-gold'
                      : isCompleted
                        ? 'border-pearl/40 bg-pearl/10 text-pearl/60'
                        : 'border-white/10 text-pearl/20'
                    }`}
                >
                  {isCompleted ? '\u2713' : i + 1}
                </div>
                <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
              </button>
              {i < totalSteps - 1 && (
                <div
                  className={`flex-1 h-px transition-colors duration-300 ${i < currentStep ? 'bg-gold/30' : 'bg-white/10'
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
