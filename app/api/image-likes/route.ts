import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/image-likes?generationId=xxx&imageType=preview
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const generationId = searchParams.get('generationId');
  const imageType = (searchParams.get('imageType') || 'preview') as 'preview' | 'high_res';

  if (!generationId) {
    return NextResponse.json({ error: 'Missing generationId' }, { status: 400 });
  }

  const likes = await prisma.imageLike.findMany({
    where: { userId, generationId, imageType },
    select: { imageIndex: true },
  });

  return NextResponse.json({
    data: likes.map((l) => l.imageIndex),
  });
}

/**
 * POST /api/image-likes
 * Toggle like: body { generationId, imageIndex, imageType, action: 'add' | 'remove' }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const { generationId, imageIndex, imageType = 'preview', action } = body as {
    generationId?: string;
    imageIndex?: number;
    imageType?: 'preview' | 'high_res';
    action?: 'add' | 'remove';
  };

  if (!generationId || typeof imageIndex !== 'number') {
    return NextResponse.json({ error: 'Missing generationId or imageIndex' }, { status: 400 });
  }

  if (action === 'remove') {
    await prisma.imageLike.deleteMany({
      where: { userId, generationId, imageIndex, imageType },
    });
    return NextResponse.json({ success: true, liked: false });
  }

  const existing = await prisma.imageLike.findFirst({
    where: { userId, generationId, imageIndex, imageType },
  });
  if (!existing) {
    await prisma.imageLike.create({
      data: { userId, generationId, imageIndex, imageType },
    });
  }
  return NextResponse.json({ success: true, liked: true });
}
