/**
 * Server-side auth helpers for API routes.
 * Uses NextAuth getServerSession - cookies are sent automatically by the client.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

/**
 * Get the current session user from NextAuth (reads from cookies).
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

/**
 * Require auth - returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<{ user: SessionUser } | Response> {
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return { user };
}
