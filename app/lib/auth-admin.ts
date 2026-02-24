import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

/** Profile shape for admin verification */
export interface AdminProfile {
  id: string;
  userId: string;
  credits: number;
  role: string;
  inviteCode: string | null;
  invitedBy: string | null;
  inviteCount: number;
  rewardCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Verify admin role from NextAuth session + Prisma profile.
 * Returns user profile if admin, throws error otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- req kept for API compatibility
export async function verifyAdmin(req: NextRequest): Promise<AdminProfile> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Missing authorization');
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
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
