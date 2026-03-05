import React from 'react';
import { Sparkles } from 'lucide-react';
import { FadeIn } from '@/components/react-bits';

export const PricingHeader = () => {
  return (
    <FadeIn delay={0.1}>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-sm text-gold font-medium tracking-wider uppercase">灵活定价方案</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-bold text-alabaster mb-6 tracking-tight">
          选择适合您的套餐
        </h1>
        <p className="text-xl text-pearl/70 max-w-2xl mx-auto font-light leading-relaxed">
          无论是一次性购买还是订阅服务，我们都为您提供灵活的选择
        </p>
      </div>
    </FadeIn>
  );
};
