"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { DashboardPage } from '@/components/DashboardPage';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

// 仪表盘路由保护：未登录用户将看到登录引导
export default function Page() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // 统一页面内导航
  const onNavigate = (page: string, _t?: unknown, generationId?: string) => {
    switch (page) {
      case 'templates':
        router.push('/templates');
        break;
      case 'pricing':
        router.push('/pricing');
        break;
      case 'generate-single':
        router.push('/generate-single');
        break;
      case 'create':
        router.push('/create');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'results':
        if (generationId) router.push(`/results/${generationId}`);
        break;
      default:
        router.push('/');
    }
  };

  // 加载中：展示轻量占位
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-obsidian">
        <div className="flex gap-3 items-center text-pearl">
          <span className="w-3 h-3 rounded-full animate-pulse bg-gold" />
          <span className="font-light tracking-widest uppercase text-sm">正在加载账户信息...</span>
        </div>
      </div>
    );
  }

  // 未登录：引导用户登录/注册
  if (!user) {
    return (
      <div className="flex items-center min-h-screen bg-obsidian text-alabaster">
        <div className="px-6 mx-auto w-full max-w-3xl">
          <div className="p-16 text-center rounded-sm border shadow-2xl bg-white/5 border-white/10 backdrop-blur-md">
            <div className="flex justify-center items-center mx-auto mb-8 w-20 h-20 rounded-full border border-gold/20 bg-gold/5 shadow-[0_0_30px_rgba(200,160,100,0.15)]">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h1 className="mb-4 text-3xl font-medium font-display text-alabaster uppercase tracking-widest">需要登录才能访问仪表盘</h1>
            <p className="mb-10 text-pearl/70 font-light text-lg tracking-wide">请登录或创建账号后继续管理您的典藏视觉资产。</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowAuth(true)}
                className="w-full sm:w-auto inline-flex justify-center gap-2 items-center px-8 py-4 font-medium transition-all duration-500 rounded-sm shadow-sm bg-gold text-obsidian hover:-translate-y-px hover:shadow-[0_0_20px_rgba(200,160,100,0.4)] uppercase tracking-[0.2em] text-xs"
              >
                <LogIn className="w-4 h-4" />
                登录 / 注册
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full sm:w-auto px-8 py-4 font-medium whitespace-nowrap bg-transparent border border-white/20 rounded-sm transition-all duration-500 text-pearl hover:bg-white/5 hover:text-alabaster uppercase tracking-[0.2em] text-xs"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  // 已登录：渲染仪表盘
  return <DashboardPage onNavigate={onNavigate} />;
}
