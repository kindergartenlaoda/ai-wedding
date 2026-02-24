import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/unfreeze
 * Release frozen credits back to available (on generation failure).
 * Body: { amount: number }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { frozenCredits: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const newFrozen = Math.max(0, profile.frozenCredits - amount);

  await prisma.profile.update({
    where: { userId },
    data: { frozenCredits: newFrozen },
  });

  return NextResponse.json({ success: true, unfrozen: amount });
}
