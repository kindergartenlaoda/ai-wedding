'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

/** Profile shape compatible with database.Profile for component compatibility */
interface Profile {
  id: string;
  userId: string;
  credits: number;
  inviteCode: string | null;
  invitedBy: string | null;
  inviteCount: number;
  rewardCredits: number;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  /** From user, for display */
  email: string;
  full_name?: string;
  invite_code?: string;
  invited_by?: string | null;
  invite_count?: number;
  reward_credits?: number;
  created_at: string;
  updated_at: string;
}

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
  const loading = status === 'loading';

  const user: AuthUser | null = session?.user
    ? { id: session.user.id, email: session.user.email ?? '', name: session.user.name, image: session.user.image }
    : null;

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const email = session.user.email ?? '';
        const name = session.user.name ?? null;
        const inviteCodeVal = data.inviteCode ?? data.invite_code ?? undefined;
        const createdAtVal = data.createdAt ?? data.created_at ?? '';
        const updatedAtVal = data.updatedAt ?? data.updated_at ?? '';
        const roleVal = data.role === 'admin' ? 'admin' : 'user';
        setProfile({
          ...data,
          email,
          full_name: name ?? undefined,
          invite_code: inviteCodeVal,
          invited_by: data.invitedBy ?? data.invited_by ?? undefined,
          invite_count: data.inviteCount ?? data.invite_count ?? 0,
          reward_credits: data.rewardCredits ?? data.reward_credits ?? 0,
          created_at: createdAtVal,
          updated_at: updatedAtVal,
          role: roleVal,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [session?.user?.id, loadProfile]);

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

    // Auto sign in after registration
    await signIn(email, password);
  };

  const signOut = async () => {
    setProfile(null);
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
