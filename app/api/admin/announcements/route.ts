import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/announcements
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const announcements = await prisma.system_announcements.findMany({
    orderBy: { created_at: 'desc' },
  });

  const formatted = announcements.map((a) => ({
    id: a.id,
    content: a.content,
    is_active: a.is_active,
    published_at: a.published_at.toISOString(),
    created_at: a.created_at.toISOString(),
    updated_at: a.updated_at.toISOString(),
  }));

  return NextResponse.json({ announcements: formatted });
}

/**
 * POST /api/admin/announcements
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: '公告内容不能为空' },
      { status: 400 }
    );
  }

  const announcement = await prisma.system_announcements.create({
    data: {
      content: body.content.trim(),
      is_active: body.is_active !== undefined ? body.is_active : false,
      published_at: body.published_at ? new Date(body.published_at) : new Date(),
    },
  });

  return NextResponse.json({
    announcement: {
      id: announcement.id,
      content: announcement.content,
      is_active: announcement.is_active,
      published_at: announcement.published_at.toISOString(),
      created_at: announcement.created_at.toISOString(),
      updated_at: announcement.updated_at.toISOString(),
    },
  }, { status: 201 });
}

/**
 * PUT /api/admin/announcements
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: '缺少公告 ID' },
      { status: 400 }
    );
  }

  const updateData: Parameters<typeof prisma.system_announcements.update>[0]['data'] = {};
  if (body.content !== undefined) updateData.content = body.content.trim();
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.published_at !== undefined) updateData.published_at = new Date(body.published_at);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const announcement = await prisma.system_announcements.update({
      where: { id: body.id },
      data: updateData,
    });
    return NextResponse.json({
      announcement: {
        id: announcement.id,
        content: announcement.content,
        is_active: announcement.is_active,
        published_at: announcement.published_at.toISOString(),
        created_at: announcement.created_at.toISOString(),
        updated_at: announcement.updated_at.toISOString(),
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: '公告不存在' }, { status: 404 });
    }
    throw e;
  }
}

/**
 * DELETE /api/admin/announcements
 */
export async function DELETE(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: '缺少公告 ID' },
      { status: 400 }
    );
  }

  try {
    await prisma.system_announcements.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if ((e as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: '公告不存在' }, { status: 404 });
    }
    throw e;
  }
}
