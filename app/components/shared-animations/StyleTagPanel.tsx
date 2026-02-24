'use client';

import { forwardRef } from 'react';
import { Wand2 } from 'lucide-react';

interface StyleTagPanelProps {
  className?: string;
  tags: string[];
  activeTag?: string;
  label?: string;
}

export const StyleTagPanel = forwardRef<HTMLDivElement, StyleTagPanelProps>(
  (
    { className = '', tags, activeTag, label = '正在选择风格意境' },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`absolute bottom-8 left-6 right-6 p-5 rounded-xl bg-obsidian/80 backdrop-blur-lg border border-white/10 shadow-2xl ${className}`}
      >
        <div className="text-xs text-pearl/70 mb-4 flex items-center gap-2 font-light tracking-wide">
          <Wand2 className="w-3.5 h-3.5 text-gold" />
          {label}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <span
              key={tag}
              data-tag={tag}
              className={`px-3 py-1.5 rounded-sm text-xs font-light transition-colors duration-300 ${
                tag === activeTag
                  ? 'bg-gold/15 border-gold/50 text-gold border'
                  : 'bg-white/5 text-pearl border border-white/5'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }
);

StyleTagPanel.displayName = 'StyleTagPanel';
