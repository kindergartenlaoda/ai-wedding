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
      <div className="flex justify-center items-center min-h-screen bg-alabaster">
        <div className="flex gap-3 items-center text-stone">
          <span className="w-3 h-3 rounded-full animate-pulse bg-obsidian" />
          <span className="font-light tracking-widest uppercase text-sm">正在加载账户信息...</span>
        </div>
      </div>
    );
  }

  // 未登录：引导用户登录/注册
  if (!user) {
    return (
      <div className="flex items-center min-h-screen bg-alabaster">
        <div className="px-6 mx-auto w-full max-w-3xl">
          <div className="p-16 text-center rounded-sm border shadow-sm bg-stone/5 border-stone/10">
            <div className="flex justify-center items-center mx-auto mb-8 w-20 h-20 rounded-full border border-stone/20 bg-obsidian shadow-lg">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h1 className="mb-4 text-3xl font-medium font-display text-obsidian uppercase tracking-widest">需要登录才能访问仪表盘</h1>
            <p className="mb-10 text-stone font-light text-lg tracking-wide">请登录或创建账号后继续管理您的项目与生成结果。</p>
            <div className="flex gap-4 justify-center items-center">
              <button
                onClick={() => setShowAuth(true)}
                className="inline-flex gap-2 items-center px-8 py-4 font-medium transition-all duration-500 rounded-sm shadow-sm bg-obsidian text-alabaster hover:bg-gold hover:text-obsidian hover:shadow-md uppercase tracking-[0.2em] text-xs"
              >
                <LogIn className="w-4 h-4" />
                登录 / 注册
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 font-medium whitespace-nowrap bg-transparent border border-obsidian rounded-sm shadow-sm transition-all duration-500 text-obsidian hover:bg-obsidian hover:text-alabaster uppercase tracking-[0.2em] text-xs"
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
