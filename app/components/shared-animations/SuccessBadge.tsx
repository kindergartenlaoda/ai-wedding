'use client';

import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';

interface SuccessBadgeProps {
  className?: string;
  text?: string;
}

export const SuccessBadge = forwardRef<HTMLDivElement, SuccessBadgeProps>(
  ({ className = '', text = '杰作已成' }, ref) => {
    return (
      <div
        ref={ref}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-obsidian/90 backdrop-blur-md border border-gold/30 text-gold px-6 py-3 rounded-full flex items-center gap-2.5 shadow-2xl z-30 ${className}`}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium tracking-[0.2em]">{text}</span>
      </div>
    );
  }
);

SuccessBadge.displayName = 'SuccessBadge';
