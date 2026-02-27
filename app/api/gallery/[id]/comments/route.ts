import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gallery/[id]/comments
 * Get comments for a gallery generation (public).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: generation_id } = await params;
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const [comments, total] = await Promise.all([
    prisma.gallery_comments.findMany({
      where: { generation_id },
      include: {
        users: { select: { name: true, image: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.gallery_comments.count({ where: { generation_id } }),
  ]);

  const items = comments.map((c) => ({
    id: c.id,
    content: c.content,
    user_name: c.users?.name || '匿名用户',
    user_image: c.users?.image || null,
    created_at: c.created_at.toISOString(),
  }));

  return NextResponse.json({
    comments: items,
    total,
    hasMore: offset + limit < total,
  });
}

/**
 * POST /api/gallery/[id]/comments
 * Add a comment to a gallery generation.
 * Body: { content: string }
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
  const { content } = body as { content?: string };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  if (content.trim().length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
  }

  const generation = await prisma.generations.findFirst({
    where: { id: generation_id, is_shared_to_gallery: true },
  });

  if (!generation) {
    return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
  }

  const comment = await prisma.gallery_comments.create({
    data: {
      generation_id,
      user_id,
      content: content.trim(),
    },
    include: {
      users: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: comment.id,
      content: comment.content,
      user_name: comment.users?.name || '匿名用户',
      user_image: comment.users?.image || null,
      created_at: comment.created_at.toISOString(),
    },
  });
}
