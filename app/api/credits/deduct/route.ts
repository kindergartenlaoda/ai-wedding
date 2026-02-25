import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/deduct
 * Confirm deduction of previously frozen credits after successful generation.
 * Body: { amount: number }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const profile = await prisma.profiles.findUnique({
    where: { user_id },
    select: { credits: true, frozen_credits: true },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.frozen_credits < amount) {
    return NextResponse.json({ error: 'Frozen amount mismatch' }, { status: 400 });
  }

  await prisma.profiles.update({
    where: { user_id },
    data: {
      credits: profile.credits - amount,
      frozen_credits: profile.frozen_credits - amount,
    },
  });

  return NextResponse.json({ success: true, deducted: amount });
}
