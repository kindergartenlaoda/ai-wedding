import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const body = (await req.json()) as { generation_id: string; index: number; image_type?: 'preview' | 'high_res'; order_id?: string };
    const { generation_id, index, image_type = 'preview', order_id } = body || {};
    if (!generation_id || typeof index !== 'number') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    await prisma.image_downloads.create({
      data: {
        user_id,
        generation_id: generation_id,
        image_index: index,
        image_type: image_type,
        order_id: order_id || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
