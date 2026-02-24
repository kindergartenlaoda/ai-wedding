'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Sparkles, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InvitePanel } from '@/components/InvitePanel';
import { FadeIn } from '@/components/react-bits';
import { Toast } from '@/components/Toast';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function ProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });
      if (!res.ok) throw new Error('保存失败');
      await refreshProfile();
      setToast({ message: '个人信息已更新', type: 'success' });
    } catch {
      setToast({ message: '保存失败，请重试', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-alabaster flex items-center justify-center">
        <p className="text-stone">请先登录</p>
      </div>
    );
  }

  return (
    <div className="py-12 min-h-screen bg-alabaster">
      <div className="px-4 mx-auto max-w-3xl sm:px-6 lg:px-8">
        <FadeIn delay={0.1}>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-stone hover:text-obsidian mb-8 transition-colors text-sm tracking-wider uppercase font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </button>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-2xl font-display font-medium text-obsidian uppercase tracking-widest mb-8">
            个人中心
          </h1>
        </FadeIn>

        {/* Profile info */}
        <FadeIn delay={0.3}>
          <div className="bg-alabaster border border-stone/10 rounded-sm p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-obsidian rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-sm text-stone">{profile.email}</p>
                <p className="text-xs text-stone/60 tracking-wider uppercase mt-1">
                  {profile.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-stone tracking-wider uppercase mb-2 font-medium">
                  昵称
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="输入昵称"
                    className="flex-1 px-4 py-2.5 border border-stone/20 rounded-sm text-sm text-obsidian bg-alabaster focus:outline-none focus:border-gold transition-colors"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-obsidian text-alabaster rounded-sm hover:bg-gold hover:text-obsidian transition-colors duration-500 text-xs tracking-wider uppercase font-medium disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Credits */}
        <FadeIn delay={0.4}>
          <div className="bg-alabaster border border-stone/10 rounded-sm p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-display font-medium text-obsidian tracking-wider uppercase mb-4">
              积分信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-stone/5 border border-stone/10 rounded-sm text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span className="text-xs text-stone tracking-wider uppercase">可用积分</span>
                </div>
                <span className="text-2xl font-display font-medium text-obsidian">
                  {profile.credits}
                </span>
              </div>
              <div className="p-4 bg-stone/5 border border-stone/10 rounded-sm text-center">
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4 text-stone" />
                  <span className="text-xs text-stone tracking-wider uppercase">冻结积分</span>
                </div>
                <span className="text-2xl font-display font-medium text-stone">
                  0
                </span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Invite panel */}
        <FadeIn delay={0.5}>
          {profile.invite_code && (
            <InvitePanel
              inviteCode={profile.invite_code}
              inviteCount={profile.invite_count ?? 0}
              rewardCredits={profile.reward_credits ?? 0}
            />
          )}
        </FadeIn>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
