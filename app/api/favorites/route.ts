import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/favorites
 * Get user's favorite template IDs
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { templateId: true },
  });

  return NextResponse.json({
    data: favorites.map((f) => f.templateId),
  });
}

/**
 * POST /api/favorites
 * Toggle favorite: body { templateId, action: 'add' | 'remove' }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { templateId, action } = body as { templateId?: string; action?: 'add' | 'remove' };

  if (!templateId) {
    return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
  }

  if (action === 'remove') {
    await prisma.favorite.deleteMany({
      where: { userId, templateId },
    });
    return NextResponse.json({ success: true, favorited: false });
  }

  await prisma.favorite.upsert({
    where: {
      userId_templateId: { userId, templateId },
    },
    create: { userId, templateId },
    update: {},
  });
  return NextResponse.json({ success: true, favorited: true });
}
