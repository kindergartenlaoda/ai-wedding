"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { UPLOAD_CONFIG, validateFile } from '@/lib/upload-config';

interface ImageUploadFieldProps {
  currentUrl: string;
  onUrlChange: (url: string) => void;
}

export function ImageUploadField({ currentUrl, onUrlChange }: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '文件验证失败');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-template-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.status === 401) {
        throw new Error('未登录或会话已过期');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '上传失败');
      }

      const data = await response.json();
      // Use presignedUrl for external access (has temporary signature)
      onUrlChange(data.presignedUrl || data.url);
    } catch (error) {
      console.error('上传出错:', error);
      setUploadError(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onUrlChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        预览图片 <span className="text-red-500">*</span>
      </Label>

      {currentUrl ? (
        <div className="relative w-full max-w-md group">
          <div className="overflow-hidden relative w-full rounded-xl border border-primary/20 aspect-video bg-muted/20">
            <Image
              src={currentUrl}
              alt="预览图"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
                移除图片
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer bg-muted/20 group",
            isUploading
              ? "opacity-50 pointer-events-none"
              : "hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-sm font-medium">处理并上传中...</span>
              </>
            ) : (
              <>
                <div className="p-4 bg-background rounded-full shadow-sm border group-hover:scale-110 transition-transform duration-300 text-primary">
                  <ImagePlus className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-medium text-foreground">点击上传预览图片</p>
                  <p className="text-xs">支持 {UPLOAD_CONFIG.ALLOWED_TYPES_TEXT}，最大 {UPLOAD_CONFIG.MAX_SIZE_TEXT}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Input
        type="url"
        value={currentUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        disabled={isUploading}
      />

      {uploadError && (
        <p className="text-sm text-red-500">{uploadError}</p>
      )}
    </div>
  );
}
