'use client';

import Image from 'next/image';
import { useDomains } from '@/hooks/useDomains';
import { getDomainCoverImage } from '@/lib/domain-fallbacks';
import FadeIn from '@/components/react-bits/animations/FadeIn';

interface StepDomainProps {
  onSelect: (domain: string) => void;
}

export function StepDomain({ onSelect }: StepDomainProps) {
  const { domains, loading, error } = useDomains();

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-pearl/60">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-red-500">加载失败: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 lg:gap-5 w-full">
        {domains.map((domain, index) => {
          const Icon = domain.iconComponent;
          return (
            <FadeIn key={domain.slug} delay={0.05 * index}>
              <button
                type="button"
                onClick={() => onSelect(domain.slug)}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-stone/5 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Image
                  src={getDomainCoverImage(domain.cover_image, domain.slug)}
                  alt={domain.name}
                  fill
                  className="object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 p-6 w-full z-10">
                  {Icon && <Icon className="h-5 w-5 mb-3 text-gold opacity-80" />}
                  <h3 className="text-md font-display text-alabaster mb-1">
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
