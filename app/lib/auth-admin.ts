import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

/** Profile shape for admin verification */
export interface AdminProfile {
  id: string;
  user_id: string;
  credits: number;
  role: string;
  invite_code: string | null;
  invited_by: string | null;
  invite_count: number;
  reward_credits: number;
  created_at: Date;
  updated_at: Date;
}

function isLocalAdminMode(): boolean {
  return process.env.LOCAL_ADMIN_MODE === 'true';
}

function localAdminProfile(): AdminProfile {
  const now = new Date();
  return {
    id: 'local-admin-profile',
    user_id: 'local-admin',
    credits: 999999,
    role: 'admin',
    invite_code: null,
    invited_by: null,
    invite_count: 0,
    reward_credits: 0,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Verify admin role from NextAuth session + Prisma profile.
 * Returns user profile if admin, throws error otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- req kept for API compatibility
export async function verifyAdmin(req: NextRequest): Promise<AdminProfile> {
  if (isLocalAdminMode()) return localAdminProfile();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Missing authorization');
  }

  const profile = await prisma.profiles.findUnique({
    where: { user_id: session.user.id },
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  if (profile.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return profile as AdminProfile;
}

/**
 * Middleware-style admin check for API routes.
 * Returns standardized error response.
 */
export async function requireAdmin(req: NextRequest): Promise<{ profile: AdminProfile } | Response> {
  try {
    const profile = await verifyAdmin(req);
    return { profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';

    if (message.includes('Forbidden')) {
      return new Response(JSON.stringify({ error: message }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
