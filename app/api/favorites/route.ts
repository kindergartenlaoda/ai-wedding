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
  const user_id = authResult.user.id;

  try {
    const favorites = await prisma.favorites.findMany({
      where: { user_id },
      select: { template_id: true },
    });

    return NextResponse.json({
      data: favorites.map((f) => f.template_id),
    });
  } catch (error) {
    console.warn('Favorites database unavailable, using empty favorites:', error);
    return NextResponse.json({ data: [], fallback: true });
  }
}

/**
 * POST /api/favorites
 * Toggle favorite: body { template_id, action: 'add' | 'remove' }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const { template_id, action } = body as { template_id?: string; action?: 'add' | 'remove' };

  if (!template_id) {
    return NextResponse.json({ error: 'Missing template_id' }, { status: 400 });
  }

  if (action === 'remove') {
    try {
      await prisma.favorites.deleteMany({
        where: { user_id, template_id },
      });
    } catch (error) {
      console.warn('Favorites database unavailable, ignoring remove:', error);
    }
    return NextResponse.json({ success: true, favorited: false });
  }

  try {
    await prisma.favorites.upsert({
      where: {
        user_id_template_id: { user_id, template_id },
      },
      create: { user_id, template_id },
      update: {},
    });
  } catch (error) {
    console.warn('Favorites database unavailable, ignoring add:', error);
  }
  return NextResponse.json({ success: true, favorited: true });
}
