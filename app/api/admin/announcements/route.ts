import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import {
  createLocalAnnouncement,
  deleteLocalAnnouncement,
  isLocalAdminStoreEnabled,
  listLocalAnnouncements,
  updateLocalAnnouncement,
} from '@/lib/local-admin-store';

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  if (isLocalAdminStoreEnabled()) {
    const announcements = await listLocalAnnouncements();
    return NextResponse.json({ announcements, local: true });
  }

  try {
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
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    const announcements = await listLocalAnnouncements();
    return NextResponse.json({ announcements, local: true });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Announcement content is required' }, { status: 400 });
  }

  if (isLocalAdminStoreEnabled()) {
    const announcement = await createLocalAnnouncement(body);
    return NextResponse.json({ announcement, local: true }, { status: 201 });
  }

  try {
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
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    const announcement = await createLocalAnnouncement(body);
    return NextResponse.json({ announcement, local: true }, { status: 201 });
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Missing announcement id' }, { status: 400 });
  }

  const updateData: Parameters<typeof prisma.system_announcements.update>[0]['data'] = {};
  if (body.content !== undefined) updateData.content = body.content.trim();
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.published_at !== undefined) updateData.published_at = new Date(body.published_at);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  if (isLocalAdminStoreEnabled()) {
    const announcement = await updateLocalAnnouncement(body.id, {
      ...(body.content !== undefined ? { content: body.content.trim() } : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      ...(body.published_at !== undefined ? { published_at: body.published_at } : {}),
    });
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    return NextResponse.json({ announcement, local: true });
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
  } catch {
    if (!isLocalAdminStoreEnabled()) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    const announcement = await updateLocalAnnouncement(body.id, {
      ...(body.content !== undefined ? { content: body.content.trim() } : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      ...(body.published_at !== undefined ? { published_at: body.published_at } : {}),
    });
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    return NextResponse.json({ announcement, local: true });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing announcement id' }, { status: 400 });
  }

  if (isLocalAdminStoreEnabled()) {
    const deleted = await deleteLocalAnnouncement(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  try {
    await prisma.system_announcements.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    if (!isLocalAdminStoreEnabled()) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    const deleted = await deleteLocalAnnouncement(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }
}
