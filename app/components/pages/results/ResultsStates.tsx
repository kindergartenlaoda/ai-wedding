import React from 'react';
import { ArrowLeft, AlertCircle, Sparkles, Repeat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn, GlassCard } from '@/components/react-bits';
import { ResultsPageData } from './types';

interface StateProps {
  onNavigate: (page: string) => void;
}

const isLocalAdminMode = process.env.NEXT_PUBLIC_LOCAL_ADMIN_MODE === 'true';

export const LoadingState = () => (
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

export const ErrorState = ({ error, onNavigate }: StateProps & { error: string }) => (
  <div className="min-h-screen bg-obsidian py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <FadeIn delay={0.1}>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
          返回仪表盘
        </button>
      </FadeIn>
      <FadeIn delay={0.2}>
        <GlassCard className="p-8 text-center bg-obsidian border-white/10 shadow-lg">
          <div className="w-16 h-16 bg-red-900/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-display font-medium text-alabaster mb-2">加载失败</h2>
          <p className="text-pearl/60 mb-6">{error}</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-3 bg-white/5 text-alabaster rounded-sm hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-xs"
          >
            返回仪表盘
          </button>
        </GlassCard>
      </FadeIn>
    </div>
  </div>
);

export const EmptyState = ({ generation, tab, onNavigate }: StateProps & { generation: ResultsPageData | null; tab: 'preview' | 'high_res' }) => (
  <div className="min-h-screen bg-obsidian py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <FadeIn delay={0.1}>
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-pearl/60 hover:text-alabaster mb-8 transition-colors font-medium shadow-sm w-fit bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
          返回仪表盘
        </button>
      </FadeIn>
      <FadeIn delay={0.2}>
        <GlassCard className="p-12 text-center bg-obsidian border-white/10 shadow-lg">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
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
                    ? (isLocalAdminMode ? '当前没有可用的高清图片' : '高清图片需要购买后才能查看')
                    : '当前没有可用的图片'
            }
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-3 bg-transparent text-pearl rounded-sm hover:text-alabaster hover:bg-white/5 transition-all border border-white/10 uppercase tracking-widest text-xs"
            >
              返回仪表盘
            </button>
            {generation?.status === 'processing' && (
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-all border border-transparent uppercase tracking-widest text-xs flex items-center gap-2"
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
