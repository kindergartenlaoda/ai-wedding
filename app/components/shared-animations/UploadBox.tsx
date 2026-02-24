'use client';

import { forwardRef } from 'react';
import { Upload } from 'lucide-react';

interface UploadBoxProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export const UploadBox = forwardRef<HTMLDivElement, UploadBoxProps>(
  (
    { className = '', title = '上传原始照片', subtitle = '支持高分辨率人像' },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-white/10 m-6 rounded-xl bg-white/5 ${className}`}
      >
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-lg">
          <Upload className="w-8 h-8 text-pearl/50" />
        </div>
        <div className="text-base text-pearl/80 font-medium tracking-wide mb-2">
          {title}
        </div>
        <div className="text-xs text-pearl/30 font-light">{subtitle}</div>
      </div>
    );
  }
);

UploadBox.displayName = 'UploadBox';
