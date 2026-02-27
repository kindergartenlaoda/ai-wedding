"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wand2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTemplateSelection } from '@/hooks/useTemplateSelection';
import { useStreamImageGeneration } from '@/hooks/useStreamImageGeneration';
import { useAvailableSources } from '@/hooks/useAvailableSources';
import { ImageUploadSection } from './GenerateSinglePage/ImageUploadSection';
import { ImageResultSection } from './GenerateSinglePage/ImageResultSection';
import { TemplateSelector } from './GenerateSinglePage/TemplateSelector';
import { GenerationSettings } from './GenerateSinglePage/GenerationSettings';
import { ImagePreviewModal } from './GenerateSinglePage/ImagePreviewModal';
import { ImageGenerationSettings, PreviewState } from './GenerateSinglePage/types';
import type { ModelConfigSource } from '@/types/model-config';

export function GenerateSinglePage() {
  const { user, profile } = useAuth();
  const { templates, loading: templatesLoading } = useTemplates();
  const { sources, loading: sourcesLoading } = useAvailableSources();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>({
    previewImage: null,
    previewTitle: '',
  });
  const [settings, setSettings] = useState<ImageGenerationSettings>({
    facePreservation: 'high',
    creativityLevel: 'conservative'
  });

  const { uploadState, fileInputRef, handleFileSelect, handleDragOver, handleDragLeave, handleDrop } = useImageUpload({
    user,
    onError: setError,
    onSuccess: setSuccess,
  });

  const {
    selectedTemplate,
    selectedPromptIndex,
    customPrompt,
    handleTemplateSelect,
    setSelectedPromptIndex,
    handleCustomPromptChange,
    getGenerateParams,
    hasValidParams,
  } = useTemplateSelection();

  // 从 URL 参数中获取提示词并自动填充
  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      handleCustomPromptChange(decodeURIComponent(promptFromUrl));
      setSuccess('已自动填充提示词，请上传图片后生成');
    }
  }, [searchParams, handleCustomPromptChange]);

  const { generationState, generateImage, downloadImage, copyBase64 } = useStreamImageGeneration({
    onError: setError,
    onSuccess: setSuccess,
  });

  const handleGenerate = async (source?: ModelConfigSource): Promise<void> => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const params = getGenerateParams();
    if (!uploadState.originalImage || !params) {
      setError('请上传图片并选择模板/提示词或输入自定义提示词！');
      return;
    }

    const imageToUse = uploadState.uploadedImageUrl || uploadState.originalImage;
    await generateImage(imageToUse, params, settings, source);
  };

  const viewImage = (imageUrl: string, title: string): void => {
    setPreviewState({
      previewImage: imageUrl,
      previewTitle: title,
    });
  };

  const closePreview = (): void => {
    setPreviewState({
      previewImage: null,
      previewTitle: '',
    });
  };

  return (
    <div className="py-12 min-h-screen bg-obsidian">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 text-alabaster rounded-sm text-xs font-medium tracking-widest shadow-sm mb-8 uppercase">
            <Wand2 className="w-4 h-4 text-gold opacity-80" />
            焕影 AI
          </div>
          <h1 className="mb-4 text-4xl font-medium md:text-5xl font-display text-alabaster uppercase tracking-wider">
            生成全新的
            <span className="italic text-gold font-serif"> 视觉作品</span>
          </h1>
          <p className="mb-8 text-sm font-light tracking-wide text-pearl/60 uppercase">上传照片，选择风格，AI智能构成专属光影</p>

          {/* 积分余额显示 */}
          {user && profile && (
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/5 border border-white/10 rounded-sm shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_rgba(200,160,100,0.8)] animate-pulse"></div>
                <span className="text-xs font-medium text-pearl/80 uppercase tracking-widest">
                  当前额度: <span className={`text-lg font-bold font-display ml-1 tracking-tight ${profile.credits >= 15 ? 'text-alabaster' : 'text-red-400'}`}>{profile.credits}</span>
                </span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <span className="text-xs text-pearl/60 font-light tracking-wide">
                单次生成消耗 <span className="font-medium text-alabaster mx-1">15</span> 积分
              </span>
            </div>
          )}

          {/* 积分不足警告 */}
          {user && profile && profile.credits < 15 && (
            <div className="flex gap-4 items-start p-5 mt-6 bg-white/5 rounded-sm border border-red-500/20 max-w-2xl mx-auto shadow-sm">
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-alabaster mb-2 uppercase tracking-widest">额度不足</p>
                <p className="text-xs text-pearl/60 font-light tracking-wide leading-relaxed">
                  您当前有 <span className="font-medium text-alabaster">{profile.credits}</span> 积分，还需要{' '}
                  <span className="font-medium text-gold">{15 - profile.credits}</span> 积分才能生成。
                  <a href="/pricing" className="ml-3 font-medium text-alabaster underline hover:text-gold transition-colors">
                    前往获取额度
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
          <ImageUploadSection
            originalImage={uploadState.originalImage}
            originalImageFile={uploadState.originalImageFile}
            isDragging={uploadState.isDragging}
            isValidatingImage={uploadState.isValidatingImage}
            user={user}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onViewImage={viewImage}
          />

          <ImageResultSection
            isGenerating={generationState.isGenerating}
            generatedImage={generationState.generatedImage}
            streamingContent={generationState.streamingContent}
            onDownload={downloadImage}
            onCopyBase64={copyBase64}
            onViewImage={viewImage}
          />
        </div>

        <TemplateSelector
          templates={templates}
          templatesLoading={templatesLoading}
          selectedTemplate={selectedTemplate}
          selectedPromptIndex={selectedPromptIndex}
          onTemplateSelect={handleTemplateSelect}
          onPromptIndexChange={setSelectedPromptIndex}
        />

        <GenerationSettings
          customPrompt={customPrompt}
          selectedTemplate={selectedTemplate}
          selectedPromptIndex={selectedPromptIndex}
          settings={settings}
          onCustomPromptChange={handleCustomPromptChange}
          onSettingsChange={setSettings}
        />

        <div className="text-center">
          <div className="flex gap-4 justify-center items-center flex-wrap">
            {sources.includes('openAi') && (
              <button
                onClick={() => handleGenerate('openAi')}
                disabled={!uploadState.originalImage || !hasValidParams() || generationState.isGenerating || (profile ? profile.credits < 15 : false)}
                className="flex gap-3 items-center px-10 py-5 text-xs font-medium bg-gold rounded-sm transition-all duration-500 text-obsidian hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    构筑中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    OpenAI 构筑
                  </>
                )}
              </button>
            )}

            {sources.includes('openRouter') && (
              <button
                onClick={() => handleGenerate('openRouter')}
                disabled={!uploadState.originalImage || !hasValidParams() || generationState.isGenerating || (profile ? profile.credits < 15 : false)}
                className="flex gap-3 items-center px-10 py-5 text-xs font-medium bg-white/5 border border-white/10 rounded-sm shadow-sm transition-all duration-500 text-alabaster hover:bg-white/10 hover:border-gold/30 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    构筑中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    OpenRouter 构筑
                  </>
                )}
              </button>
            )}

            {sources.includes('302') && (
              <button
                onClick={() => handleGenerate('302')}
                disabled={!uploadState.originalImage || !hasValidParams() || generationState.isGenerating || (profile ? profile.credits < 15 : false)}
                className="flex gap-3 items-center px-10 py-5 text-xs font-medium bg-white/5 border border-white/10 rounded-sm shadow-sm transition-all duration-500 text-alabaster hover:bg-white/10 hover:border-gold/30 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {generationState.isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    构筑中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    302 构筑
                  </>
                )}
              </button>
            )}
          </div>
          {sourcesLoading && (
            <p className="mt-4 text-xs font-light text-pearl/60 tracking-wider">
              正在加载可用的模型来源...
            </p>
          )}
          {!sourcesLoading && sources.length === 0 && (
            <p className="mt-4 text-xs font-light text-red-400 tracking-wider">
              暂无可用的模型配置，请联系管理员
            </p>
          )}
          {!hasValidParams() && uploadState.originalImage && (
            <p className="mt-4 text-xs font-light text-pearl/60 tracking-wider">
              请选择模板风格或输入自定义提示词
            </p>
          )}
          {profile && profile.credits < 15 && uploadState.originalImage && hasValidParams() && (
            <p className="mt-4 text-xs font-medium text-red-400 tracking-wider">
              积分不足，需要 15 积分才能生成
            </p>
          )}
        </div>

        {error && (
          <div className="flex gap-4 items-start p-5 mt-8 bg-red-500/10 rounded-sm border border-red-500/20 shadow-sm max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm font-light tracking-wide text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex gap-4 items-start p-5 mt-8 bg-gold/10 rounded-sm border border-gold/20 shadow-sm max-w-2xl mx-auto">
            <CheckCircle className="w-5 h-5 text-gold flex-shrink-0" />
            <p className="text-sm font-light tracking-wide text-amber-100">{success}</p>
          </div>
        )}
      </div>

      <ImagePreviewModal
        previewImage={previewState.previewImage}
        previewTitle={previewState.previewTitle}
        onClose={closePreview}
        onCopyBase64={copyBase64}
      />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
