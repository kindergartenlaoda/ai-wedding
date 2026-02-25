import { useState, useEffect } from 'react';
import { Download, Heart, Share2, ArrowLeft, Sparkles, Lock, Check, X, Repeat, TrendingUp, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useImageLikes } from '@/hooks/useImageLikes';
import { ImageCompareSlider } from './ImageCompareSlider';
import { recommendPackage, getBestValue, calculateSavings } from '@/lib/pricing-recommender';
import { rateImages } from '@/lib/image-rating';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { ShareModal } from './ShareModal';
import type { GenerationWithRelations } from '@/types/database';

interface ResultsPageProps {
  onNavigate: (page: string) => void;
  generationId?: string;
}

export function ResultsPage({ onNavigate, generationId }: ResultsPageProps) {
  const { user } = useAuth();
  const [generation, setGeneration] = useState<GenerationWithRelations | null>(null);
  const [loading, setLoading] = useState(!!generationId);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const localLike = useState<Set<number>>(new Set());
  const { liked: likedPreview, toggleLike: toggleLikePreview } = useImageLikes(generationId, 'preview');
  const { liked: likedHigh, toggleLike: toggleLikeHigh } = useImageLikes(generationId, 'high_res');
  const [tab, setTab] = useState<'preview' | 'high_res'>('preview');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!generationId) {
      setLoading(false);
      setError('未提供生成 ID');
      return;
    }
    (async () => {
      try {
        console.log('正在加载生成结果，ID:', generationId);
        const res = await fetch(`/api/generations/${generationId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('加载失败');
        const data = await res.json();

        if (!data) {
          throw new Error('未找到生成记录');
        }

        console.log('生成结果数据:', {
          id: data.id,
          status: data.status,
          preview_images_count: data.preview_images?.length || 0,
          high_res_images_count: data.high_res_images?.length || 0,
        });

        setGeneration({
          ...data,
          project: data.project || { name: '', uploaded_photos: [] },
          template: data.template || { name: '' },
        });
        setError(null);
      } catch (err) {
        console.error('获取生成结果失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [generationId]);

  // 只使用真实数据，不使用测试数据
  const resultsPreview = generation?.preview_images || [];
  const resultsHigh = generation?.high_res_images || [];
  const currentImages = tab === 'preview' ? resultsPreview : resultsHigh;

  const recommendedPackages = recommendPackage(selectedImages.size, currentImages.length);
  const bestValue = getBestValue(selectedImages.size, currentImages.length);
  const imageRatings = rateImages(currentImages);

  const toggleImageSelection = (index: number) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedImages(newSelection);
  };

  const handlePurchase = () => {
    onNavigate('pricing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-md bg-white/5 border border-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-obsidian py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn delay={0.1}>
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
              aria-label="返回仪表盘"
            >
              <ArrowLeft className="w-5 h-5" />
              返回仪表盘
            </button>
          </FadeIn>

          <FadeIn delay={0.2}>
            <GlassCard className="p-8 text-center bg-obsidian border-white/10 shadow-lg">
              <div className="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-display font-medium text-alabaster mb-2">加载失败</h2>
              <p className="text-pearl/60 mb-6">{error}</p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3 bg-white/5 text-alabaster rounded-sm hover:bg-white/10 transition-all duration-300 font-medium border border-white/10 hover:shadow-glow uppercase tracking-widest text-xs"
              >
                返回仪表盘
              </button>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    );
  }

  // 空状态 - 没有生成结果
  if (!generation || currentImages.length === 0) {
    return (
      <div className="min-h-screen bg-obsidian py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn delay={0.1}>
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
              aria-label="返回仪表盘"
            >
              <ArrowLeft className="w-5 h-5" />
              返回仪表盘
            </button>
          </FadeIn>

          <FadeIn delay={0.2}>
            <GlassCard className="p-12 text-center bg-obsidian border-white/10 shadow-lg">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                <Sparkles className="w-10 h-10 text-gold opacity-80" />
              </div>
              <h2 className="text-2xl font-display font-medium text-alabaster mb-2 tracking-wider">
                {generation ? '图片生成中' : '未找到生成结果'}
              </h2>
              <p className="text-pearl/60 mb-8 font-light tracking-wide max-w-md mx-auto">
                {generation?.status === 'processing'
                  ? '您的图片正在生成中，请稍候片刻...'
                  : generation?.status === 'pending'
                    ? '您的请求正在队列中，马上开始生成...'
                    : generation?.status === 'failed'
                      ? '生成失败，请重试或联系客服'
                      : tab === 'high_res'
                        ? '高清图片需要购买后才能查看'
                        : '当前没有可用的图片'
                }
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-8 py-3 bg-transparent text-pearl rounded-sm hover:text-alabaster hover:bg-white/5 transition-all duration-300 font-medium border border-white/10 uppercase tracking-widest text-xs"
                >
                  返回仪表盘
                </button>
                {generation?.status === 'processing' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all duration-500 font-medium flex items-center gap-2 border border-transparent hover:shadow-glow uppercase tracking-widest text-xs"
                  >
                    <Repeat className="w-5 h-5" />
                    刷新页面
                  </button>
                )}
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn delay={0.1}>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
            aria-label="返回仪表盘"
          >
            <ArrowLeft className="w-5 h-5" />
            返回仪表盘
          </button>
        </FadeIn>

        <FadeIn delay={0.2}>
          <GlassCard className="mb-8 bg-obsidian border-white/10 shadow-lg">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center shadow-sm">
                  <Sparkles className="w-7 h-7 text-gold opacity-80" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-medium text-alabaster tracking-wider mb-1">照片已准备好！</h1>
                  <p className="text-pearl/60 font-light tracking-wide">{generation?.project?.name || '您的项目'} <span className="mx-2 opacity-30">|</span> 生成了 <span className="text-gold">{currentImages.length}</span> 张精美作品</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-8">
                <button className="px-6 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all duration-500 font-medium flex items-center gap-2 shadow-sm border border-transparent hover:shadow-[0_0_15px_rgba(200,160,100,0.3)] tracking-widest text-xs uppercase">
                  <Heart className="w-4 h-4" />
                  保存收藏
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-6 py-3 bg-white/5 backdrop-blur-sm text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all duration-500 font-medium flex items-center gap-2 border border-white/10 tracking-widest text-xs uppercase"
                >
                  <Share2 className="w-5 h-5" />
                  分享相册
                </button>
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        <FadeIn delay={0.3}>
          <GlassCard className="mb-8 bg-transparent border-white/10">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex-1 border-l-2 border-gold pl-4">
                  <h2 className="text-xl font-display font-medium text-alabaster tracking-wider">预览画廊</h2>
                  <p className="text-sm text-pearl/60 font-light mt-1 tracking-wide">
                    {selectedImages.size > 0 ? `已选择 ${selectedImages.size} 张图片` : '选择图片购买'}
                  </p>
                </div>

                {/* 批量操作按钮 */}
                {tab === 'preview' && currentImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const allIndices = new Set(currentImages.map((_, i) => i));
                        setSelectedImages(allIndices);
                      }}
                      className="px-5 py-2.5 bg-white/5 text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all duration-300 font-medium text-xs tracking-widest uppercase border border-white/10"
                    >
                      全选
                    </button>
                    <button
                      onClick={() => {
                        const newSelection = new Set<number>();
                        currentImages.forEach((_, i) => {
                          if (!selectedImages.has(i)) {
                            newSelection.add(i);
                          }
                        });
                        setSelectedImages(newSelection);
                      }}
                      className="px-5 py-2.5 bg-white/5 text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all duration-300 font-medium text-xs tracking-widest uppercase border border-white/10"
                    >
                      反选
                    </button>
                    <button
                      onClick={() => {
                        // 智能推荐：选择AI评分最高的前3张
                        const topRated = Array.from(imageRatings.entries())
                          .sort((a, b) => b[1].score - a[1].score)
                          .slice(0, 3)
                          .map(([index]) => index);
                        setSelectedImages(new Set(topRated));
                      }}
                      className="px-5 py-2.5 bg-gold/10 text-gold rounded-sm hover:bg-gold/20 transition-all duration-300 font-medium text-xs tracking-widest uppercase border border-gold/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(200,160,100,0.1)]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      智能推荐
                    </button>
                    {selectedImages.size > 0 && (
                      <button
                        onClick={() => setSelectedImages(new Set())}
                        className="px-5 py-2.5 bg-transparent text-pearl/70 rounded-sm hover:bg-white/5 hover:text-alabaster transition-all duration-300 font-medium text-xs tracking-widest uppercase border border-transparent"
                      >
                        清空
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePurchase}
                  disabled={selectedImages.size === 0}
                  className="px-8 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian hover:shadow-[0_0_20px_rgba(200,160,100,0.3)] transition-all duration-500 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-transparent uppercase tracking-widest text-xs"
                >
                  <Download className="w-4 h-4" />
                  购买所选 ({selectedImages.size})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-sm p-4 flex items-start gap-4 shadow-sm hover:bg-white/10 transition-colors">
                  <Lock className="w-5 h-5 text-pearl/50 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-alabaster">
                    <p className="font-medium mb-1 tracking-wide">预览模式</p>
                    <p className="text-pearl/60 font-light leading-relaxed">这些是带水印的预览图。购买后可下载无水印的高清版本。</p>
                  </div>
                </div>
                <div className="bg-gold/5 border border-gold/20 rounded-sm p-4 flex items-start gap-4 shadow-sm hover:bg-gold/10 transition-colors">
                  <Sparkles className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-alabaster">
                    <p className="font-medium mb-1 tracking-wide">AI智能推荐</p>
                    <p className="text-pearl/60 font-light leading-relaxed">点击"智能推荐"按钮，AI会自动选择质量最高的3张图片。</p>
                  </div>
                </div>
              </div>

              {/* 预览/高清切换 */}
              <div className="mb-8 flex items-center gap-3">
                <button
                  onClick={() => setTab('preview')}
                  className={`px-8 py-2.5 rounded-sm text-xs font-medium tracking-widest uppercase transition-all duration-500 border ${tab === 'preview' ? 'bg-gold text-obsidian border-gold shadow-[0_0_15px_rgba(200,160,100,0.3)]' : 'bg-transparent text-pearl/60 border-white/10 hover:bg-white/5 hover:text-alabaster'}`}
                >
                  预览
                </button>
                <button
                  onClick={() => setTab('high_res')}
                  className={`px-8 py-2.5 rounded-sm text-xs font-medium tracking-widest uppercase transition-all duration-500 border ${tab === 'high_res' ? 'bg-gold text-obsidian border-gold shadow-[0_0_15px_rgba(200,160,100,0.3)]' : 'bg-transparent text-pearl/60 border-white/10 hover:bg-white/5 hover:text-alabaster'}`}
                  disabled={resultsHigh.length === 0}
                >
                  高清{resultsHigh.length === 0 ? ' (未解锁)' : ''}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentImages.map((url, index) => {
                  const rating = imageRatings.get(index);

                  return (
                    <div
                      key={index}
                      className="relative aspect-[3/4] rounded-sm overflow-hidden group cursor-pointer border border-white/5 hover:border-gold/50 transition-all duration-700 shadow-lg hover:shadow-[0_0_25px_rgba(200,160,100,0.15)]"
                      onClick={() => setLightboxIndex(index)}
                    >
                      <Image
                        src={url}
                        alt={`Result ${index + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            (tab === 'preview' ? toggleLikePreview : toggleLikeHigh)(index);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border ${(tab === 'preview' ? likedPreview : likedHigh).has(index)
                            ? 'bg-gold border-gold text-obsidian scale-110'
                            : 'bg-obsidian/40 backdrop-blur-md text-pearl hover:text-alabaster border-white/20 hover:bg-obsidian/80 hover:scale-110 hover:border-white/40'
                            }`}
                          aria-label={(tab === 'preview' ? likedPreview : likedHigh).has(index) ? '取消收藏' : '收藏'}
                        >
                          <Heart className={`w-5 h-5 ${(tab === 'preview' ? likedPreview : likedHigh).has(index) ? 'fill-obsidian' : ''}`} />
                        </button>
                        {tab === 'preview' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleImageSelection(index);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border ${selectedImages.has(index)
                              ? 'bg-gold border-gold text-obsidian scale-110'
                              : 'bg-obsidian/40 backdrop-blur-md text-pearl hover:text-alabaster border-white/20 hover:bg-obsidian/80 hover:scale-110 hover:border-white/40'
                              }`}
                            aria-label={selectedImages.has(index) ? '取消选择' : '选择'}
                          >
                            {selectedImages.has(index) ? (
                              <Check className="w-6 h-6" />
                            ) : (
                              <div className="w-6 h-6 border-2 border-current rounded" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* AI评分标签 */}
                      {rating && rating.badges.length > 0 && (
                        <div className="absolute bottom-3 left-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {rating.badges.map((badge, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-1 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-lg"
                            >
                              {badge}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 增强水印显示 */}
                      {tab === 'preview' && (
                        <>
                          {/* 对角线水印 */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                            <div
                              className="text-alabaster text-6xl font-bold opacity-10 whitespace-nowrap"
                              style={{ transform: 'rotate(-45deg) scale(1.5)' }}
                            >
                              PREVIEW • 预览 • PREVIEW
                            </div>
                          </div>
                          {/* 边角标签 */}
                          <div className="absolute top-0 left-0 px-4 py-2 bg-obsidian/80 backdrop-blur-md text-pearl/80 text-xs font-medium tracking-widest uppercase rounded-br-sm border-b border-r border-white/10">
                            预览版
                          </div>
                        </>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2">
                          {tab === 'preview' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleImageSelection(index);
                              }}
                              className={`flex-1 px-4 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl border ${selectedImages.has(index)
                                ? 'bg-gold border-gold text-obsidian'
                                : 'bg-obsidian/60 backdrop-blur-md text-pearl border-white/20 hover:text-alabaster hover:bg-obsidian/90 hover:border-white/40'
                                }`}
                            >
                              {selectedImages.has(index) ? (
                                <>
                                  <Check className="w-5 h-5" />
                                  已选择
                                </>
                              ) : (
                                <>
                                  <div className="w-5 h-5 border-2 border-current rounded" />
                                  选择此图
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </FadeIn>

        <FadeIn delay={0.4}>
          <GlassCard className="bg-obsidian border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />
            <div className="p-10 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-medium text-2xl text-alabaster tracking-wider">价格选项</h3>
                {selectedImages.size > 0 && bestValue && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold rounded-sm border border-gold/20 text-xs tracking-widest uppercase font-medium shadow-[0_0_15px_rgba(200,160,100,0.1)]">
                    <TrendingUp className="w-4 h-4 text-gold" />
                    为您推荐：{bestValue.name}
                  </div>
                )}
              </div>
              {selectedImages.size > 0 && (
                <p className="text-sm text-pearl/60 font-light tracking-wide mb-8">
                  已选择 <span className="text-gold font-medium">{selectedImages.size}</span> 张图片 • 根据您的选择智能推荐最优惠套餐
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedPackages.slice(0, 3).map((pkg) => {
                  const isRecommended = pkg.recommended;
                  const savings = selectedImages.size > 0 ? calculateSavings(selectedImages.size, pkg.price) : 0;

                  return (
                    <div
                      key={pkg.id}
                      className={`relative rounded-sm p-8 border transition-all duration-500 cursor-pointer overflow-hidden ${isRecommended
                        ? 'bg-obsidian border-gold shadow-[0_0_20px_rgba(200,160,100,0.15)] transform hover:-translate-y-1'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                        }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-0 right-0 bg-gold text-obsidian px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-bl-sm">
                          推荐
                        </div>
                      )}
                      <div className={`text-4xl font-display font-medium mb-3 ${isRecommended ? 'text-gold' : 'text-alabaster'}`}>${pkg.price}</div>
                      <div className={`mb-6 text-sm tracking-widest uppercase ${isRecommended ? 'text-alabaster' : 'text-pearl/60'}`}>
                        {pkg.name}
                      </div>
                      {savings > 0 && (
                        <div className={`text-xs font-medium mb-4 px-3 py-1 rounded-sm inline-block ${isRecommended ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-white/5 text-alabaster border border-white/10'}`}>
                          节省 ${savings}
                        </div>
                      )}
                      <ul className={`space-y-3 text-sm font-light ${isRecommended ? 'text-pearl' : 'text-pearl/60'}`}>
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className={`w-4 h-4 flex-shrink-0 ${isRecommended ? 'text-gold' : 'text-pearl/40'}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={currentImages}
          index={lightboxIndex}
          liked={(user && generationId ? (tab === 'preview' ? likedPreview : likedHigh) : localLike[0])}
          onToggleLike={(i) => (user && generationId ? (tab === 'preview' ? toggleLikePreview : toggleLikeHigh)(i) : localLike[1]((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
          }))}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(i) => setLightboxIndex(i)}
          generationId={generationId}
          imageType={tab}
          originalPhotos={generation?.project?.uploaded_photos || []}
        />
      )}

      {/* 分享弹窗 */}
      {showShareModal && generation && currentImages.length > 0 && (
        <ShareModal
          projectName={generation.project?.name || '我的项目'}
          templateName={generation.template?.name || '精美风格'}
          imageUrl={currentImages[0] || ''}
          imageCount={currentImages.length}
          shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/results/${generationId}`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, onClose, onIndexChange, liked, onToggleLike, generationId, imageType = 'preview', originalPhotos = [] }: { images: string[]; index: number; onClose: () => void; onIndexChange: (i: number) => void; liked: Set<number>; onToggleLike: (i: number) => void; generationId?: string; imageType?: 'preview' | 'high_res'; originalPhotos?: string[]; }) {
  const [compareMode, setCompareMode] = useState(false);

  // 键盘导航：Esc 关闭，←/→ 切换，C切换对比模式
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === 'c' || e.key === 'C') {
        if (originalPhotos.length > 0) setCompareMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, index, onClose, onIndexChange, originalPhotos.length]);

  const current = images[index];
  const originalPhoto = originalPhotos[index] || originalPhotos[0];

  const toPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onIndexChange((index - 1 + images.length) % images.length);
  };
  const toNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onIndexChange((index + 1) % images.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 顶部条：索引指示器与关闭 */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4">
        <div className="text-pearl/80 text-sm font-medium tracking-widest">
          {index + 1} <span className="text-pearl/40 mx-2">/</span> {images.length}
        </div>
        <button
          className="p-2 bg-obsidian/40 border border-white/10 backdrop-blur-md text-pearl rounded-sm hover:bg-white/10 hover:text-alabaster transition-all duration-500 shadow-md"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="关闭"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative w-full h-full max-w-6xl max-h-[85vh]">
        {compareMode && originalPhoto ? (
          <div onClick={(e) => e.stopPropagation()}>
            <ImageCompareSlider
              beforeImage={originalPhoto}
              afterImage={current}
              beforeLabel="原图"
              afterLabel="AI生成"
            />
          </div>
        ) : (
          <>
            <Image
              src={current}
              alt="预览"
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
            {/* 增强水印 - Lightbox版本 */}
            {imageType === 'preview' && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div
                    className="text-alabaster text-8xl font-bold opacity-10 whitespace-nowrap"
                    style={{ transform: 'rotate(-45deg)' }}
                  >
                    PREVIEW • 预览 • PREVIEW
                  </div>
                </div>
                <div className="absolute top-8 left-8 px-6 py-3 bg-obsidian/80 border border-gold/30 backdrop-blur-md text-gold text-xs font-medium tracking-widest uppercase rounded-sm shadow-[0_0_20px_rgba(200,160,100,0.1)]">
                  预览版 • 购买后无水印
                </div>
              </>
            )}
          </>
        )}
      </div>
      {/* 底部操作条：点赞/下载/分享/对比 */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLike(index); }}
          className={`px-6 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center gap-2 shadow-xl border ${liked.has(index) ? 'bg-gold border-gold text-obsidian' : 'bg-obsidian/60 border-white/10 backdrop-blur-md text-pearl hover:text-alabaster hover:bg-white/10'}`}
        >
          <Heart className="w-4 h-4" />
          {liked.has(index) ? '已收藏' : '收藏'}
        </button>
        <a
          href={current}
          download
          onClick={(e) => {
            e.stopPropagation();
            // 异步上报下载记录（不阻断浏览器下载）
            void (async () => {
              try {
                await fetch('/api/images/track-download', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ generation_id: generationId, index, image_type: imageType }),
                });
              } catch (err) { void err; }
            })();
          }}
          className="px-6 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md text-pearl hover:text-alabaster hover:bg-white/10 shadow-xl"
        >
          <Download className="w-4 h-4" />
          下载
        </a>
        <button
          className="px-6 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center gap-2 bg-obsidian/60 border border-white/10 backdrop-blur-md text-pearl hover:text-alabaster hover:bg-white/10 shadow-xl"
          onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(current).catch(() => { }); }}
        >
          <Share2 className="w-4 h-4" />
          复制链接
        </button>
        {originalPhotos.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setCompareMode(prev => !prev); }}
            className={`px-6 py-3 rounded-sm transition-all duration-500 font-medium text-xs tracking-widest uppercase flex items-center gap-2 shadow-xl border ${compareMode ? 'bg-gold border-gold text-obsidian' : 'bg-obsidian/60 border-white/10 backdrop-blur-md text-pearl hover:text-alabaster hover:bg-white/10'}`}
          >
            <Repeat className="w-4 h-4" />
            {compareMode ? '退出对比' : '对比原图'}
          </button>
        )}
      </div>

      {/* 左右切换 */}
      <button
        className="absolute left-8 p-3 bg-obsidian/40 border border-white/10 backdrop-blur-md text-pearl rounded-full hover:bg-white/10 hover:text-alabaster hover:scale-110 transition-all duration-500 shadow-xl"
        onClick={toPrev}
        aria-label="上一张"
      >
        ‹
      </button>
      <button
        className="absolute right-8 p-3 bg-obsidian/40 border border-white/10 backdrop-blur-md text-pearl rounded-full hover:bg-white/10 hover:text-alabaster hover:scale-110 transition-all duration-500 shadow-xl"
        onClick={toNext}
        aria-label="下一张"
      >
        ›
      </button>
    </div>
  );
}
