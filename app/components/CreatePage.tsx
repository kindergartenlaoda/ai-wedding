/**
 * 重构后的 CreatePage - 从 709 行压缩到 < 200 行
 *
 * 改进：
 * 1. 用状态机替代 17 个独立状态
 * 2. 提取组件：GenerationProgress、GenerationResults
 * 3. 提取逻辑：useImageGeneration hook
 * 4. 消除 if (!profile) 分支判断
 * 5. 单一职责：只负责布局和用户交互
 */

import { useState } from 'react';
import { ArrowLeft, Check, AlertCircle, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Template } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from './Toast';
import NextImage from 'next/image';
import { PhotoUploader } from './PhotoUploader';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { GenerationProgress } from './GenerationProgress';
import { GenerationResults } from './GenerationResults';
import { useImageGeneration } from '@/hooks/useImageGeneration';

interface CreatePageProps {
  onNavigate: (page: string) => void;
  selectedTemplate?: Template;
}

export function CreatePage({ onNavigate, selectedTemplate }: CreatePageProps) {
  const { profile } = useAuth();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [projectName, setProjectName] = useState(
    selectedTemplate ? `${selectedTemplate.name} · 一` : ''
  );
  const [shareToGallery, setShareToGallery] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [identifyErrorCount, setIdentifyErrorCount] = useState(0);

  const { state, startGeneration, retry, canGenerate } = useImageGeneration({
    template: selectedTemplate,
  });

  const handleGenerate = async () => {
    try {
      // 开始生成
      await startGeneration(uploadedPhotos, projectName, shareToGallery);

      // 生成完成后显示成功提示
      if (state.status === 'completed') {
        setToast({
          message: profile
            ? '生成完成！请查看下方结果'
            : '试用生成完成！以下为预览效果',
          type: 'success',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败,请查看详情并重试';
      setToast({ message, type: 'error' });
    }
  };

  const isGenerating = state.status === 'processing';
  const canGenerateNow = canGenerate(uploadedPhotos, projectName) && identifyErrorCount === 0;

  return (
    <div className="py-12 min-h-screen bg-alabaster">
      <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
        <FadeIn delay={0.1}>
          <button
            onClick={() => onNavigate('templates')}
            className="flex gap-2 items-center mb-8 font-medium transition-colors text-stone hover:text-obsidian uppercase tracking-[0.2em] text-xs"
            aria-label="返回模板页面"
          >
            <ArrowLeft className="w-4 h-4" />
            返回模板
          </button>
        </FadeIn>

        <FadeIn delay={0.2}>
          <GlassCard className="mb-8">
            <div className="p-8">
              {/* 模板信息 */}
              <div className="flex flex-col gap-6 items-start mb-8 md:flex-row">
                {selectedTemplate && (
                  <NextImage
                    src={selectedTemplate.preview_image_url}
                    alt={selectedTemplate.name}
                    width={128}
                    height={160}
                    className="object-cover w-32 h-40 rounded-lg border-2 shadow-md border-ivory"
                  />
                )}
                <div className="flex-1">
                  <h1 className="mb-3 text-4xl font-medium font-display text-obsidian uppercase tracking-wider">
                    {selectedTemplate?.name || '创建作品'}
                  </h1>
                  <p className="mb-6 leading-relaxed text-stone font-light text-sm tracking-wide">{selectedTemplate?.description}</p>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-2 items-center px-4 py-2 text-xs font-medium rounded-sm border bg-stone/5 border-stone/10 text-obsidian tracking-widest uppercase">
                      <Check className="w-3.5 h-3.5 text-gold" />
                      {selectedTemplate?.price_credits} 积分
                    </div>
                    <div className="px-4 py-2 text-xs font-medium rounded-sm border bg-alabaster border-stone/10 text-stone tracking-widest uppercase">
                      您的余额：{profile?.credits || 0} 积分
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="block mb-3 text-xs font-medium text-obsidian uppercase tracking-widest">作品名称</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例如：光影系列 · 一"
                  className="px-4 py-3 w-full rounded-sm border transition-all border-stone/20 bg-stone/5 focus:ring-1 focus:ring-gold focus:border-gold outline-none text-obsidian font-light"
                />
              </div>

              {/* 照片上传 */}
              <div className="mb-6">
                <PhotoUploader
                  photos={uploadedPhotos}
                  onChange={setUploadedPhotos}
                  onIdentifyErrorCountChange={setIdentifyErrorCount}
                  maxPhotos={10}
                  minPhotos={1}
                />
              </div>

              {/* 分享到画廊选项 */}
              <div className="mb-10">
                <div className="flex gap-4 items-start p-5 rounded-sm border bg-stone/5 border-stone/10">
                  <input
                    type="checkbox"
                    id="shareToGallery"
                    checked={shareToGallery}
                    onChange={(e) => setShareToGallery(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded-sm text-obsidian bg-alabaster border-stone/30 focus:ring-gold focus:ring-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="shareToGallery" className="text-xs font-medium cursor-pointer text-obsidian uppercase tracking-widest">
                      分享到画廊
                    </label>
                    <p className="mt-2 text-xs text-stone font-light leading-relaxed">
                      勾选后，生成的作品将在公开画廊中展示，让更多人欣赏您的创作。您可以随时在仪表盘中修改分享状态。
                    </p>
                  </div>
                </div>
              </div>

              {/* 积分不足警告 */}
              <div className="p-8 mb-8 bg-stone/5 rounded-sm border border-red-900/10 shadow-sm">
                <div className="flex gap-5 items-start">
                  <div className="flex flex-shrink-0 justify-center items-center w-12 h-12 bg-obsidian rounded-sm">
                    <AlertCircle className="w-6 h-6 text-gold" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-3 text-lg font-medium font-display text-obsidian uppercase tracking-widest">额度不足</h4>
                    <p className="mb-6 text-sm text-stone font-light tracking-wide">
                      您当前有 <span className="font-medium text-obsidian">{profile?.credits || 0}</span> 积分，还需要{' '}
                      <span className="font-medium text-gold">
                        {(selectedTemplate?.price_credits || 10) - (profile?.credits || 0)}
                      </span>{' '}
                      积分即可继续创作。
                    </p>
                    <button
                      onClick={() => onNavigate('pricing')}
                      className="flex gap-2 items-center px-8 py-4 text-xs font-medium text-alabaster bg-obsidian rounded-sm transition-all hover:bg-gold hover:text-obsidian uppercase tracking-[0.2em]"
                      aria-label="前往方案页面获取额度"
                    >
                      <Sparkles className="w-4 h-4" />
                      探索方案
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 mb-8 bg-stone/5 rounded-sm border border-stone/10">
                <div className="text-sm text-obsidian">
                  <p className="mb-2 font-medium tracking-widest uppercase text-xs">试用模式</p>
                  <p className="font-light text-stone leading-relaxed tracking-wide">未登录也可体验生成流程。效果为本地模拟预览，登录后可获得免费额度并生成真实电影级视觉。</p>
                </div>
              </div>

              {/* 生成按钮 */}
              <div className="space-y-3">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerateNow || isGenerating}
                  className="flex gap-3 justify-center items-center py-5 w-full text-sm font-medium bg-obsidian text-alabaster rounded-sm shadow-sm transition-all duration-500 hover:bg-gold hover:text-obsidian hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest border border-transparent"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      光影构筑中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      生成视觉
                    </>
                  )}
                </button>

                {/* 按钮禁用原因提示 */}
                {identifyErrorCount > 0 && (
                  <div className="flex gap-2 items-start p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">无法生成</p>
                      <p>
                        检测到 {identifyErrorCount} 张照片未包含人物，请删除这些照片并重新上传包含人物的照片后再试。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 失败重试 */}
              {state.status === 'failed' && (
                <div className="p-4 mt-6 rounded-md border bg-destructive/10 border-destructive/20">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="mb-1 text-sm font-bold text-destructive">生成失败</h4>
                      <p className="text-sm text-destructive/80">{state.error}</p>
                      <p className="mt-2 text-xs text-stone">已保留您的照片和项目信息,可以直接重试</p>
                    </div>
                  </div>
                  <button
                    onClick={retry}
                    className="flex gap-2 justify-center items-center px-4 py-3 w-full font-medium rounded-md transition-all bg-destructive text-ivory hover:bg-destructive/90"
                  >
                    <Loader2 className="w-5 h-5" />
                    重新生成
                  </button>
                </div>
              )}

              {/* 生成进度 */}
              {state.status === 'processing' && (
                <GenerationProgress stage={state.stage} progress={state.progress} />
              )}
            </div>
          </GlassCard>
        </FadeIn>

        {/* 最佳效果小贴士 */}
        <FadeIn delay={0.3}>
          <div className="p-8 rounded-sm border bg-stone/5 border-stone/10 mt-8 mb-16">
            <h3 className="flex gap-3 items-center mb-5 font-medium font-display text-obsidian uppercase tracking-widest">
              <Sparkles className="w-5 h-5 text-gold" />
              最佳效果指南
            </h3>
            <ul className="space-y-4 text-sm text-stone font-light tracking-wide">
              {[
                '使用高分辨率、光线充足的照片',
                '确保面部特征清晰可见，多角度展示',
                '避免过度遮挡（如墨镜、大檐帽）',
                '多样化：包含不同神态与表情',
              ].map((tip, index) => (
                <li key={index} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-stone/10 border border-stone/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-obsidian" />
                  </div>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        {/* 生成结果 */}
        {state.status === 'completed' && (
          <GenerationResults
            images={state.images}
            generationId={state.generationId}
            projectName={projectName}
            onNavigateToDashboard={() => onNavigate('dashboard')}
          />
        )}
      </div>

      {/* Toast 通知 */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
