import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/announcements
 * 获取当前激活的系统公告（单条）
 * 此接口无需身份验证，所有用户均可访问
 */
export async function GET() {
  const announcement = await prisma.systemAnnouncement.findFirst({
    where: { isActive: true },
    orderBy: { publishedAt: 'desc' },
  });

  return NextResponse.json({ announcement: announcement || null });
}
