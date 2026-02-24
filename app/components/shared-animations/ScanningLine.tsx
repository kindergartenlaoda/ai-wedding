'use client';

import { forwardRef } from 'react';

interface ScanningLineProps {
  className?: string;
}

export const ScanningLine = forwardRef<HTMLDivElement, ScanningLineProps>(
  ({ className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_20px_2px_rgba(200,160,100,0.6)] z-20 ${className}`}
      />
    );
  }
);

ScanningLine.displayName = 'ScanningLine';
