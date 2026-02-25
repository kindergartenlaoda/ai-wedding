import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { isShared } = await request.json();

    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const generation = await prisma.generations.findUnique({
      where: { id },
      select: { user_id: true, status: true },
    });

    if (!generation) {
      return NextResponse.json(
        { error: '生成记录不存在' },
        { status: 404 }
      );
    }

    if (generation.user_id !== user_id) {
      return NextResponse.json(
        { error: '无权限操作此记录' },
        { status: 403 }
      );
    }

    if (generation.status !== 'completed') {
      return NextResponse.json(
        { error: '只有已完成的生成记录才能分享到画廊' },
        { status: 400 }
      );
    }

    await prisma.generations.update({
      where: { id },
      data: { is_shared_to_gallery: isShared },
    });

    return NextResponse.json({
      success: true,
      message: isShared ? '已分享到画廊' : '已取消分享',
    });
  } catch (error) {
    logger.error({ error }, '分享状态切换 API 错误');
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
