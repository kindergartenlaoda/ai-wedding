import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { getLocalGeneration, isLocalGenerationStoreEnabled } from '@/lib/local-generation-store';
import { getLocalFeedback, upsertLocalFeedback } from '@/lib/local-feature-store';

/**
 * POST /api/generations/[id]/feedback
 * Submit or update satisfaction feedback for a generation.
 * Body: { rating: 1-5, comment?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;
  const { id: generation_id } = await params;

  const body = await req.json();
  const { rating, comment } = body as { rating?: number; comment?: string };

  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
  }

  if (isLocalGenerationStoreEnabled(user_id)) {
    const generation = await getLocalGeneration(generation_id, user_id);
    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }
    const feedback = await upsertLocalFeedback({ generationId: generation_id, userId: user_id, rating, comment });
    return NextResponse.json({ ok: true, feedback, local: true });
  }

  const generation = await prisma.generations.findFirst({
    where: { id: generation_id, user_id },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
  }

  const feedback = await prisma.generation_feedbacks.upsert({
    where: {
      generation_id_user_id: { generation_id, user_id },
    },
    update: {
      rating,
      comment: comment?.trim() || null,
    },
    create: {
      generation_id,
      user_id,
      rating,
      comment: comment?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, feedback });
}

/**
 * GET /api/generations/[id]/feedback
 * Get the current user's feedback for a generation.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;
  const { id: generation_id } = await params;

  if (isLocalGenerationStoreEnabled(user_id)) {
    const feedback = await getLocalFeedback(generation_id, user_id);
    return NextResponse.json({ feedback, local: true });
  }

  const feedback = await prisma.generation_feedbacks.findUnique({
    where: {
      generation_id_user_id: { generation_id, user_id },
    },
  });

  return NextResponse.json({ feedback });
}
