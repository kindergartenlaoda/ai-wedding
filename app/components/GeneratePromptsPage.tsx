"use client";

import { useState, useRef } from 'react';
import { Sparkles, Upload, Loader2, AlertCircle, CheckCircle, Wand2, ExternalLink } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { usePromptGeneration } from '@/hooks/usePromptGeneration';
import Image from 'next/image';

export function GeneratePromptsPage() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [lastImageBase64, setLastImageBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isGenerating, progress, prompts, generatePrompts, clearPrompts } = usePromptGeneration();

  const handleFileSelect = async (file: File): Promise<void> => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setError(null);
    setSuccess(null);

    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setUploadedImage(base64);
        clearPrompts();
      };
      reader.readAsDataURL(compressedFile);
    } catch {
      setError('图片处理失败，请重试');
    }
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!user || !uploadedImage) return;

    setError(null);
    setSuccess(null);
    setLastImageBase64(uploadedImage);

    try {
      await generatePrompts(uploadedImage);
      setSuccess('成功生成 5 个风格方案！');
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败，请重试';
      setError(message);
    }
  };

  const handleRetry = async (): Promise<void> => {
    if (!lastImageBase64) return;

    setError(null);
    setSuccess(null);

    try {
      await generatePrompts(lastImageBase64);
      setSuccess('成功生成 5 个风格方案！');
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败，请重试';
      setError(message);
    }
  };

  const handleUsePrompt = (prompt: string): void => {
    // 新窗口打开 generate-single 页面，并传递提示词
    const encodedPrompt = encodeURIComponent(prompt);
    window.open(`/generate-single?prompt=${encodedPrompt}`, '_blank');
  };

  return (
    <div className="py-12 min-h-screen bg-obsidian">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 text-alabaster rounded-sm text-xs font-medium tracking-widest shadow-sm mb-8 uppercase">
            <Sparkles className="w-4 h-4 text-gold opacity-80" />
            AI 风格定制
          </div>
          <h1 className="mb-4 text-4xl font-medium md:text-5xl font-display text-alabaster tracking-wider">
            智能生成
            <span className="italic text-gold font-serif"> 风格方案</span>
          </h1>
          <p className="mb-6 text-sm text-pearl/60 font-light tracking-wide">
            上传参考图片，AI 为您生成 5 个专业的风格方案
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 左侧：图片上传 */}
          <div className="space-y-6">
            <div className="p-8 rounded-sm border shadow-inner bg-black/40 border-white/10">
              <h2 className="mb-4 text-2xl font-medium font-display text-alabaster tracking-wider">上传参考图片</h2>
              <p className="mb-6 text-sm text-pearl/60 font-light leading-relaxed">
                上传一张您喜欢的风格参考图片，AI 将分析并生成相似风格的拍摄方案
              </p>

              {/* 上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-sm p-8 text-center transition-all duration-500 ${isDragging
                    ? 'border-gold bg-gold/10'
                    : 'border-white/10 hover:border-gold/50'
                  } ${uploadedImage ? 'bg-white/5' : 'bg-transparent'}`}
              >
                {uploadedImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={uploadedImage}
                        alt="上传的图片"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        clearPrompts();
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="px-4 py-3 text-xs tracking-widest uppercase font-medium text-gold hover:text-gold/80 transition-colors"
                    >
                      重新上传
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-4 text-pearl/40" />
                    <p className="mb-2 text-sm font-medium tracking-wide text-alabaster">
                      拖拽图片到这里，或点击上传
                    </p>
                    <p className="mb-6 text-xs text-pearl/60 font-light">支持 JPG、PNG 格式，最大 10MB</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-8 py-3 bg-white/10 text-alabaster rounded-sm hover:bg-white/20 transition-all duration-500 text-xs font-medium tracking-widest uppercase border border-white/10 shadow-sm"
                    >
                      选择图片
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </>
                )}
              </div>

              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                disabled={!uploadedImage || isGenerating}
                className="w-full mt-6 flex gap-3 justify-center items-center px-8 py-4 text-sm font-medium bg-gold rounded-sm transition-all duration-500 text-obsidian hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    生成风格方案
                  </>
                )}
              </button>

              {/* 进度条 */}
              {isGenerating && (
                <div className="mt-4">
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center mt-2 text-pearl/60">{progress}%</p>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：提示词展示 */}
          <div className="space-y-6">
            <div className="p-8 rounded-sm border shadow-inner bg-black/40 border-white/10 h-full">
              <h2 className="mb-4 text-2xl font-medium font-display text-alabaster tracking-wider">生成的风格方案</h2>
              <p className="mb-8 text-sm text-pearl/60 font-light">
                选择一个风格方案，在新窗口中生成图片
              </p>

              {prompts.length === 0 && !isGenerating && (
                <div className="py-20 text-center text-pearl/40">
                  <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-30" />
                  <p className="text-sm font-light tracking-wide">上传图片后点击"生成风格方案"</p>
                </div>
              )}

              {isGenerating && (
                <div className="py-20 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-6 animate-spin text-gold opacity-80" />
                  <p className="text-sm text-pearl/60 font-light tracking-wide">AI 正在分析图片并生成风格方案...</p>
                </div>
              )}

              {prompts.length > 0 && (
                <div className="space-y-4">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.index}
                      className="p-5 rounded-sm border border-white/5 bg-white/5 hover:border-gold/30 transition-all duration-300 hover:shadow-md group"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gold/10 text-gold text-xs font-mono">
                                {prompt.index}
                              </span>
                              <h3 className="text-xs font-medium tracking-widest text-pearl/80 uppercase">中文</h3>
                            </div>
                            <p className="text-sm text-pearl/60 font-light leading-relaxed pl-8">{prompt.chinese}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-pearl/40 text-[10px] font-mono">
                                EN
                              </span>
                              <h3 className="text-xs font-medium tracking-widest text-pearl/80 uppercase">English</h3>
                            </div>
                            <p className="text-sm text-pearl/60 font-light leading-relaxed pl-8 font-mono">{prompt.english}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUsePrompt(prompt.english)}
                          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white/10 text-alabaster rounded-sm hover:bg-gold hover:text-obsidian hover:shadow-sm transition-all duration-300 text-xs font-medium tracking-widest uppercase border border-white/10 group-hover:border-gold/20"
                        >
                          使用
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="flex gap-3 items-start p-4 mt-6 bg-red-50 rounded-lg border border-red-200 max-w-4xl mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              {lastImageBase64 && (
                <button
                  onClick={handleRetry}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-700"
                >
                  重试
                </button>
              )}
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="flex gap-3 items-start p-4 mt-6 bg-green-50 rounded-lg border border-green-200 max-w-4xl mx-auto">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{success}</p>
          </div>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

