"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { ResultsPage } from '@/components/ResultsPage';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

// 结果页路由保护：未登录用户需先登录
export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const onNavigate = (page: string) => {
    switch (page) {
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'pricing':
        router.push('/pricing');
        break;
      default:
        router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-obsidian">
        <div className="flex items-center gap-3 text-pearl/60">
          <span className="w-3 h-3 rounded-full bg-gold animate-pulse" />
          <span>正在加载账户信息...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-obsidian to-charcoal flex items-center">
        <div className="max-w-3xl mx-auto px-6 w-full">
          <div className="bg-charcoal/50 border border-white/10 rounded-2xl shadow-sm p-10 text-center">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-charcoal flex items-center justify-center border border-white/5">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h1 className="text-2xl font-display font-medium text-alabaster mb-2">需要登录才能查看生成结果</h1>
            <p className="text-pearl/60 mb-8">请登录或创建账号后继续查看与管理您的作品。</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 bg-gold text-obsidian rounded-md hover:bg-gold/90 transition-all duration-200 shadow-sm hover:shadow-glow font-medium inline-flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                登录 / 注册
              </button>
              <button
                onClick={() => router.push('/templates')}
                className="px-6 py-3 bg-charcoal text-alabaster rounded-md border border-white/10 hover:bg-white/5 transition-all duration-200 font-medium"
              >
                浏览模板
              </button>
            </div>
          </div>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  return <ResultsPage onNavigate={onNavigate} generationId={params.id} />;
}
