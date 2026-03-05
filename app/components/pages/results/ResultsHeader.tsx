import React from 'react';
import { Sparkles, Heart, Share2 } from 'lucide-react';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { ResultsPageData } from './types';

interface ResultsHeaderProps {
  generation: ResultsPageData | null;
  currentImagesCount: number;
  onShowShareModal: () => void;
}

export const ResultsHeader = ({ generation, currentImagesCount, onShowShareModal }: ResultsHeaderProps) => {
  return (
    <FadeIn delay={0.2}>
      <GlassCard className="mb-8 bg-obsidian border-white/10 shadow-lg">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center shadow-sm">
              <Sparkles className="w-7 h-7 text-gold opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-medium text-alabaster tracking-wider mb-1">
                照片已准备好！
              </h1>
              <p className="text-pearl/60 font-light tracking-wide">
                {generation?.project?.name || '您的项目'}{' '}
                <span className="mx-2 opacity-30">|</span>
                生成了 <span className="text-gold">{currentImagesCount}</span> 张精美作品
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-8">
            <button className="px-6 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all duration-500 font-medium flex items-center gap-2 shadow-sm border border-transparent tracking-widest text-xs uppercase">
              <Heart className="w-4 h-4" />
              保存收藏
            </button>
            <button
              onClick={onShowShareModal}
              className="px-6 py-3 bg-white/5 backdrop-blur-sm text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all duration-500 font-medium flex items-center gap-2 border border-white/10 tracking-widest text-xs uppercase"
            >
              <Share2 className="w-5 h-5" />
              分享相册
            </button>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
};
