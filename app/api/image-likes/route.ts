import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/image-likes?generation_id=xxx&image_type=preview
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const generation_id = searchParams.get('generation_id');
  const image_type = (searchParams.get('image_type') || 'preview') as 'preview' | 'high_res';

  if (!generation_id) {
    return NextResponse.json({ error: 'Missing generation_id' }, { status: 400 });
  }

  const likes = await prisma.image_likes.findMany({
    where: { user_id, generation_id, image_type },
    select: { image_index: true },
  });

  return NextResponse.json({
    data: likes.map((l) => l.image_index),
  });
}

/**
 * POST /api/image-likes
 * Toggle like: body { generation_id, image_index, image_type, action: 'add' | 'remove' }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const { generation_id, image_index, image_type = 'preview', action } = body as {
    generation_id?: string;
    image_index?: number;
    image_type?: 'preview' | 'high_res';
    action?: 'add' | 'remove';
  };

  if (!generation_id || typeof image_index !== 'number') {
    return NextResponse.json({ error: 'Missing generation_id or image_index' }, { status: 400 });
  }

  if (action === 'remove') {
    await prisma.image_likes.deleteMany({
      where: { user_id, generation_id, image_index, image_type },
    });
    return NextResponse.json({ success: true, liked: false });
  }

  const existing = await prisma.image_likes.findFirst({
    where: { user_id, generation_id, image_index, image_type },
  });
  if (!existing) {
    await prisma.image_likes.create({
      data: { user_id, generation_id, image_index, image_type },
    });
  }
  return NextResponse.json({ success: true, liked: true });
}
