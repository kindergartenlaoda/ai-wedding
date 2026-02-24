'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Coins } from 'lucide-react';
import type { GenerationDomain } from '@/types/domain';
import { DOMAIN_CONFIG } from '@/types/domain';
import type { Template } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import FadeIn from '@/components/react-bits/animations/FadeIn';

interface StepStyleProps {
  domain: GenerationDomain;
  templates: Template[];
  onSelect: (template: Template) => void;
  onBack: () => void;
}

export function StepStyle({
  domain,
  templates,
  onSelect,
  onBack,
}: StepStyleProps) {
  const { profile } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const domainConfig = DOMAIN_CONFIG[domain];
  const userCredits = profile?.credits ?? 0;

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const handleSelect = (template: Template) => {
    setSelectedId(template.id);
  };

  const handleNext = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
        <FadeIn>
          <div className="flex items-center gap-4 mb-10">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-full border border-white/10 text-pearl/60 hover:text-pearl hover:border-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xs font-medium tracking-[0.3em] text-pearl/50 uppercase mb-1">
                Step 02 &middot; {domainConfig.name}
              </h2>
              <p className="text-2xl md:text-3xl font-display text-alabaster tracking-tight">
                选择创作风格
              </p>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 pb-28">
          {templates.map((template, index) => {
            const isSelected = template.id === selectedId;
            const insufficientCredits =
              userCredits < template.price_credits;

            return (
              <FadeIn key={template.id} delay={0.03 * index}>
                <button
                  type="button"
                  onClick={() => handleSelect(template)}
                  disabled={insufficientCredits}
                  className={`group relative w-full aspect-[3/4] overflow-hidden rounded-sm outline-none transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-gold shadow-[0_0_30px_rgba(200,160,100,0.2)] scale-[1.02]'
                      : 'hover:scale-[1.01] shadow-lg'
                  } ${insufficientCredits ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
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

                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />

                  {insufficientCredits && (
                    <div className="absolute inset-0 bg-obsidian/60 flex items-center justify-center z-10">
                      <span className="text-xs text-pearl/60 bg-obsidian/80 px-3 py-1.5 rounded-full border border-white/10">
                        积分不足
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <h3 className="text-sm font-medium text-alabaster mb-1 truncate">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-pearl/60">
                      <Coins className="w-3 h-3" />
                      <span>{template.price_credits} 积分</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center z-10">
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

      {selectedTemplate && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-obsidian/90 backdrop-blur-md border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm overflow-hidden relative">
                {selectedTemplate.preview_image_url && (
                  <Image
                    src={selectedTemplate.preview_image_url}
                    alt={selectedTemplate.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                )}
              </div>
              <div>
                <p className="text-sm text-alabaster font-medium">
                  {selectedTemplate.name}
                </p>
                <p className="text-xs text-pearl/50 flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {selectedTemplate.price_credits} 积分
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-gold text-obsidian text-sm font-medium rounded-sm hover:bg-gold/90 transition-colors tracking-wide"
            >
              下一步
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
