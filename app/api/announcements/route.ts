import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listLocalAnnouncements } from '@/lib/local-admin-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/announcements
 * 获取当前激活的系统公告（单条）
 * 此接口无需身份验证，所有用户均可访问
 */
export async function GET() {
  if (process.env.LOCAL_ADMIN_MODE === 'true') {
    const announcements = await listLocalAnnouncements();
    const announcement = announcements.find((item) => item.is_active) || null;
    return NextResponse.json({ announcement, local: true });
  }

  try {
    const announcement = await prisma.system_announcements.findFirst({
      where: { is_active: true },
      orderBy: { published_at: 'desc' },
    });

    return NextResponse.json({ announcement: announcement || null });
  } catch (error) {
    console.warn('Announcements database unavailable, using empty announcement:', error);
    return NextResponse.json({ announcement: null, fallback: true });
  }
}
