'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Profile } from '@/types/database';

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ADMIN_ENABLED = process.env.NEXT_PUBLIC_LOCAL_ADMIN_MODE === 'true';
const LOCAL_ADMIN_USER: AuthUser = {
  id: 'local-admin',
  email: 'admin@local.test',
  name: 'Local Admin',
};

function createLocalAdminProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: 'local-admin-profile',
    user_id: LOCAL_ADMIN_USER.id,
    email: LOCAL_ADMIN_USER.email,
    full_name: LOCAL_ADMIN_USER.name || 'Local Admin',
    credits: 999999,
    frozen_credits: 0,
    role: 'admin',
    invite_code: null,
    invited_by: null,
    invite_count: 0,
    reward_credits: 0,
    created_at: now,
    updated_at: now,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  // Capture invite param (?inv=CODE) from URL for registration
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const inv = url.searchParams.get('inv');
        if (inv) {
          localStorage.setItem('referrer_code', inv);
        }
      }
    } catch {
      // ignore URL parse errors
    }
  }, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileFetchedRef = useRef(false);
  const loading = LOCAL_ADMIN_ENABLED ? false : status === 'loading';

  const user: AuthUser | null = LOCAL_ADMIN_ENABLED
    ? LOCAL_ADMIN_USER
    : session?.user
    ? { id: session.user.id, email: session.user.email ?? '', name: session.user.name, image: session.user.image }
    : null;

  const loadProfile = useCallback(async () => {
    if (LOCAL_ADMIN_ENABLED) {
      setProfile(createLocalAdminProfile());
      return;
    }

    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        // 统一使用 snake_case 字段（与 database.ts 的 Profile 类型一致）
        setProfile({
          id: data.id,
          user_id: data.user_id || data.userId || session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.name ?? data.full_name ?? undefined,
          credits: data.credits ?? 0,
          frozen_credits: data.frozen_credits ?? data.frozenCredits ?? 0,
          role: data.role === 'admin' ? 'admin' : 'user',
          invite_code: data.invite_code ?? data.inviteCode ?? null,
          invited_by: data.invited_by ?? data.invitedBy ?? null,
          invite_count: data.invite_count ?? data.inviteCount ?? 0,
          reward_credits: data.reward_credits ?? data.rewardCredits ?? 0,
          created_at: data.created_at ?? data.createdAt ?? new Date().toISOString(),
          updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.name]);

  const claimInviteReward = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const refCode = localStorage.getItem('referrer_code');
      if (!refCode) return;

      // 新的 API 不再需要传 invitee_id，由服务端从 session 获取
      await fetch('/api/invite/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ref_code: refCode }),
      });

      localStorage.removeItem('referrer_code');
    } catch {
      // Silently ignore claim errors to avoid blocking auth flow
    }
  }, []);

  const inviteClaimedRef = useRef(false);

  useEffect(() => {
    if (LOCAL_ADMIN_ENABLED) {
      setProfile(createLocalAdminProfile());
      return;
    }

    if (session?.user?.id) {
      if (!profileFetchedRef.current) {
        profileFetchedRef.current = true;
        loadProfile();
      }
      if (!inviteClaimedRef.current) {
        inviteClaimedRef.current = true;
        claimInviteReward();
      }
    } else {
      profileFetchedRef.current = false;
      inviteClaimedRef.current = false;
      setProfile(null);
    }
  }, [session?.user?.id, loadProfile, claimInviteReward]);

  const signIn = async (email: string, password: string) => {
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      throw new Error(result.error === 'CredentialsSignin' ? '邮箱或密码错误' : result.error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: fullName }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '注册失败');
    }

    await signIn(email, password);
  };

  const signOut = async () => {
    setProfile(null);
    if (LOCAL_ADMIN_ENABLED) {
      setProfile(createLocalAdminProfile());
      return;
    }
    await nextAuthSignOut({ redirect: false });
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
