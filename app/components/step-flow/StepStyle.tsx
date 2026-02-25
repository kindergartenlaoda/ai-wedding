'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Coins } from 'lucide-react';
import type { GenerationDomain } from '@/types/domain';
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

        <div className="grid grid-cols-2 gap-3 pb-8">
          {templates.map((template, index) => {
            const isSelected = template.id === selectedId;
            const insufficientCredits =
              userCredits < template.price_credits;

            return (
              <FadeIn key={template.id} delay={0.03 * index}>
                <button
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={`group relative w-full aspect-[3/4] overflow-hidden rounded-sm outline-none transition-all duration-300 ${isSelected
                    ? 'ring-2 ring-gold shadow-[0_0_30px_rgba(200,160,100,0.2)] scale-[1.02]'
                    : 'hover:scale-[1.01] shadow-lg'
                    }`}
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
                    <div className="absolute top-3 left-3 z-20">
                      <span className="text-[10px] text-pearl/80 bg-red-500/80 px-2 py-1 rounded-sm border border-red-500/20 backdrop-blur-md shadow-lg">
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
        <FadeIn>
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
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
                <p className="text-sm text-alabaster font-medium truncate max-w-[120px]">
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
              className={`px-5 py-2.5 text-xs font-medium rounded-sm transition-colors tracking-wide shrink-0 ${userCredits < selectedTemplate.price_credits
                ? 'bg-white/10 text-pearl hover:bg-white/20'
                : 'bg-gold text-obsidian hover:bg-gold/90'
                }`}
            >
              {userCredits < selectedTemplate.price_credits ? '去充值' : '继续'}
            </button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
