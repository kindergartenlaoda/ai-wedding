import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/credits/freeze
 * Freeze credits before generation starts.
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

  const available = profile.credits - profile.frozen_credits;
  if (available < amount) {
    return NextResponse.json(
      { error: 'Insufficient credits', available },
      { status: 402 }
    );
  }

  await prisma.profiles.update({
    where: { user_id },
    data: { frozen_credits: profile.frozen_credits + amount },
  });

  return NextResponse.json({ success: true, frozen: amount });
}
