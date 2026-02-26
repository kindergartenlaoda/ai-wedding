'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Palette, Sparkles, ArrowRight, Gift, Users } from 'lucide-react';

const ONBOARDING_KEY = 'ai-wedding-onboarding-done';

interface OnboardingStep {
  icon: typeof Upload;
  title: string;
  description: string;
  highlight?: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: Gift,
    title: '欢迎！您已获得 50 免费积分',
    description: '注册即赠 50 积分，足够体验多种 AI 写真效果。每次生成消耗 10-20 积分。',
    highlight: '50 积分',
  },
  {
    icon: Palette,
    title: '选择领域和风格',
    description: '从婚纱、儿童、证件照等多种领域中选择，再挑选心仪的模板风格。',
  },
  {
    icon: Upload,
    title: '上传您的照片',
    description: '上传 1-5 张清晰的正面照片，AI 将根据这些照片进行创作。',
  },
  {
    icon: Sparkles,
    title: '生成 AI 作品',
    description: '点击生成，等待片刻即可获得精美的 AI 写真作品。',
  },
  {
    icon: Users,
    title: '邀请好友，双方得积分',
    description: '分享您的邀请码给朋友，对方注册后您获得 30 积分，好友获得 70 积分。',
    highlight: '双方得积分',
  },
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  // Focus trap and Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="新手引导"
        tabIndex={-1}
        className="bg-black/90 rounded-sm shadow-2xl max-w-md w-full overflow-hidden border border-white/10 outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-display font-medium text-alabaster tracking-wider uppercase">
            欢迎使用
          </h2>
          <button
            onClick={handleComplete}
            className="p-1.5 rounded-sm text-pearl/60 hover:text-alabaster hover:bg-white/10 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="w-7 h-7 text-gold" />
          </div>

          <div className="text-xs text-pearl/60 tracking-[0.2em] uppercase mb-4">
            {currentStep + 1} / {STEPS.length}
          </div>

          <h3 className="text-xl font-display font-medium text-alabaster mb-3 tracking-wide">
            {step.title}
          </h3>
          <p className="text-pearl/60 font-light leading-relaxed text-sm">
            {step.description}
          </p>
          {step.highlight && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-gold/10 border border-gold/20">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-gold tracking-wider">{step.highlight}</span>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep
                  ? 'w-6 bg-gold'
                  : idx < currentStep
                    ? 'w-1.5 bg-gold/50'
                    : 'w-1.5 bg-white/20'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleComplete}
            className="text-xs text-pearl/60 hover:text-alabaster transition-colors tracking-wider uppercase"
          >
            跳过
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold text-obsidian rounded-sm hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(200,160,100,0.4)] transition-all duration-500 text-xs tracking-[0.15em] uppercase font-medium"
          >
            {currentStep < STEPS.length - 1 ? '下一步' : '开始创作'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to determine if onboarding should be shown.
 * Returns true if the user is logged in and hasn't completed onboarding.
 */
export function useShowOnboarding(isLoggedIn: boolean): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setShow(false);
      return;
    }
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setShow(true);
    }
  }, [isLoggedIn]);

  return show;
}
