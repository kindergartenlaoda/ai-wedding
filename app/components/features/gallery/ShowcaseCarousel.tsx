'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { FadeIn } from '@/components/react-bits';

interface ShowcaseItem {
  domain: string;
  domainLabel: string;
  before: string;
  after: string;
  description: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    domain: 'wedding',
    domainLabel: '婚纱写真',
    before: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
    description: '日常自拍秒变浪漫婚纱照',
  },
  {
    domain: 'portrait',
    domainLabel: '人像写真',
    before: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    description: '普通照片变身专业人像',
  },
  {
    domain: 'artistic',
    domainLabel: '艺术创作',
    before: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=600&auto=format&fit=crop',
    description: '一键获得油画风格艺术照',
  },
  {
    domain: 'id_photo',
    domainLabel: '证件照',
    before: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1623951551061-f09b2e04fbee?q=80&w=600&auto=format&fit=crop',
    description: '在家拍出标准证件照',
  },
];

export function ShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = (index: number) => {
    setActiveIndex((index + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);
  };

  const item = SHOWCASE_ITEMS[activeIndex];

  return (
    <FadeIn delay={0.2}>
      <div className="relative">
        {/* Main showcase area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Before */}
          <div className="relative group">
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-obsidian/80 backdrop-blur-sm border border-white/10 rounded-sm">
              <span className="text-xs font-medium text-pearl/70 tracking-widest uppercase">Before</span>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-white/10 bg-stone/5">
              <Image
                src={item.before}
                alt={`${item.domainLabel} - 原图`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/40 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* After */}
          <div className="relative group">
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-gold/20 backdrop-blur-sm border border-gold/30 rounded-sm">
              <span className="text-xs font-medium text-gold tracking-widest uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                After
              </span>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-gold/20 bg-stone/5 shadow-[0_0_30px_rgba(200,160,100,0.1)]">
              <Image
                src={item.after}
                alt={`${item.domainLabel} - AI 生成`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Info + Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 text-xs font-medium text-gold bg-gold/10 border border-gold/20 rounded-sm tracking-widest uppercase">
                {item.domainLabel}
              </span>
            </div>
            <p className="text-pearl/60 font-light text-sm">{item.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => goTo(activeIndex - 1)}
              className="w-10 h-10 rounded-sm border border-white/10 flex items-center justify-center text-pearl/60 hover:text-alabaster hover:border-gold/30 transition-all duration-300"
              aria-label="上一个"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {SHOWCASE_ITEMS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 bg-gold' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                  aria-label={`查看案例 ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(activeIndex + 1)}
              className="w-10 h-10 rounded-sm border border-white/10 flex items-center justify-center text-pearl/60 hover:text-alabaster hover:border-gold/30 transition-all duration-300"
              aria-label="下一个"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
