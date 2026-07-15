'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';
import type { GenerationDomain } from '@/types/domain';
import type { Template } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import FadeIn from '@/components/react-bits/animations/FadeIn';

interface StepStyleProps {
  domain: GenerationDomain;
  templates: Template[];
  onSelect: (template: Template) => void;
  onBack: () => void;
  fullWidth?: boolean;
}

export function StepStyle({
  templates,
  onSelect,
  fullWidth,
}: StepStyleProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const userCredits = profile?.credits ?? 0;

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const handleSelect = (template: Template) => {
    setSelectedId(template.id);
  };

  const handleNext = () => {
    if (selectedTemplate) {
      if (userCredits < selectedTemplate.price_credits) {
        router.push('/pricing');
      } else {
        onSelect(selectedTemplate);
      }
    }
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex-1 w-full">

        <div className={`grid gap-3 pb-8 ${fullWidth ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'grid-cols-2'}`}>
          {templates.map((template, index) => {
            const isSelected = template.id === selectedId;
            const insufficientCredits =
              userCredits < template.price_credits;

            return (
              <FadeIn key={template.id} delay={0.03 * index}>
                <button
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={`group relative w-full aspect-[3/4] overflow-hidden rounded-sm outline-none transition-all duration-500 transform-gpu ${isSelected
                    ? 'ring-2 ring-gold shadow-[0_0_30px_rgba(200,160,100,0.2)] scale-[1.02]'
                    : 'hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
                    }`}
                >
                  <div className="absolute inset-0">
                    {template.preview_image_url ? (
                      <Image
                        src={template.preview_image_url}
                        alt={template.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-stone/10" />
                    )}
                  </div>

                  {/* Gradient overlay animated on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-out" />

                  {insufficientCredits && (
                    <div className="absolute top-3 left-3 z-20 transition-transform duration-300 group-hover:-translate-y-1">
                      <span className="text-[10px] text-pearl/80 bg-red-500/80 px-2 py-1 rounded-sm border border-red-500/20 backdrop-blur-md shadow-lg">
                        积分不足
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10 transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                    <h3 className="text-sm font-medium text-alabaster mb-1 truncate drop-shadow-lg transition-colors duration-300 group-hover:text-gold">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-pearl/60 transition-colors duration-300 group-hover:text-pearl/90">
                      <Coins className="w-3 h-3" />
                      <span>{template.price_credits} 积分</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-gold/50 bg-gold shadow-[0_0_15px_rgba(200,160,100,0.5)] flex items-center justify-center z-10 animate-in zoom-in-50 duration-300">
                      <span className="text-obsidian text-xs font-bold">
                        &#10003;
                      </span>
                    </div>
                  )}
                </button>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {selectedTemplate && createPortal(
        <div className="fixed bottom-[20px] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-2xl p-4 bg-obsidian/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mx-auto px-2 sm:px-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-sm overflow-hidden relative shadow-lg">
                {selectedTemplate.preview_image_url && (
                  <Image
                    src={selectedTemplate.preview_image_url}
                    alt={selectedTemplate.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                )}
              </div>
              <div>
                <p className="text-base text-alabaster font-medium truncate max-w-[200px] sm:max-w-xs block">
                  {selectedTemplate.name}
                </p>
                <p className="text-sm text-pearl/60 flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-gold/80" />
                  {selectedTemplate.price_credits} 积分
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`px-8 py-3.5 text-sm font-medium rounded-sm transition-all duration-300 tracking-wider shrink-0 shadow-lg ${userCredits < selectedTemplate.price_credits
                ? 'bg-white/10 text-pearl hover:bg-white/20'
                : 'bg-gold text-obsidian hover:bg-gold/90 hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] hover:-translate-y-0.5'
                }`}
            >
              {userCredits < selectedTemplate.price_credits ? '充值积分' : '确认风格并继续'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
