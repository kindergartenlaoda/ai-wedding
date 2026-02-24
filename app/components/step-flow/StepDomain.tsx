'use client';

import Image from 'next/image';
import { DOMAIN_CONFIG, GENERATION_DOMAINS } from '@/types/domain';
import type { GenerationDomain } from '@/types/domain';
import FadeIn from '@/components/react-bits/animations/FadeIn';

const DOMAIN_IMAGES: Record<GenerationDomain, string> = {
  wedding:
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
  children:
    'https://images.unsplash.com/photo-1627885489708-ce79ebabc2c8?q=80&w=800&auto=format&fit=crop',
  id_photo:
    'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=800&auto=format&fit=crop',
  artistic:
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800&auto=format&fit=crop',
  portrait:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
  anime:
    'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=800&auto=format&fit=crop',
  landscape:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  product:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
};

interface StepDomainProps {
  onSelect: (domain: GenerationDomain) => void;
}

export function StepDomain({ onSelect }: StepDomainProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16">
      <FadeIn>
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-xs font-medium tracking-[0.3em] text-pearl/50 uppercase">
            Step 01
          </h2>
          <p className="text-4xl md:text-5xl font-display text-alabaster tracking-tight">
            选择您的创作领域
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl w-full">
        {GENERATION_DOMAINS.map((domainId, index) => {
          const domain = DOMAIN_CONFIG[domainId];
          const Icon = domain.icon;
          return (
            <FadeIn key={domainId} delay={0.05 * index}>
              <button
                type="button"
                onClick={() => onSelect(domainId)}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-stone/5 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Image
                  src={DOMAIN_IMAGES[domainId]}
                  alt={domain.name}
                  fill
                  className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 p-6 w-full z-10">
                  <Icon className="h-5 w-5 mb-3 text-gold opacity-80" />
                  <h3 className="text-lg font-display text-alabaster mb-1">
                    {domain.name}
                  </h3>
                  <p className="text-xs text-pearl/60 font-light translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {domain.description}
                  </p>
                </div>
              </button>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
