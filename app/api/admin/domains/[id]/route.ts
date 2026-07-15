import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';
import {
  deleteLocalDomain,
  getLocalDomain,
  isLocalAdminStoreEnabled,
  updateLocalDomain,
} from '@/lib/local-admin-store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  if (isLocalAdminStoreEnabled()) {
    const domain = await getLocalDomain(id);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    return NextResponse.json({ data: domain, local: true });
  }

  try {
    const domain = await prisma.domains.findUnique({ where: { id } });
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: domain.id,
        slug: domain.slug,
        name: domain.name,
        description: domain.description,
        icon: domain.icon,
        color: domain.color,
        cover_image: domain.cover_image,
        is_active: domain.is_active,
        sort_order: domain.sort_order,
        require_face_detection: domain.require_face_detection,
        created_at: domain.created_at.toISOString(),
        updated_at: domain.updated_at.toISOString(),
      },
    });
  } catch (error) {
    if (!isLocalAdminStoreEnabled()) throw error;
    const domain = await getLocalDomain(id);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    return NextResponse.json({ data: domain, local: true });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const body = await req.json();

  if (isLocalAdminStoreEnabled()) {
    const domain = await updateLocalDomain(id, body);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    if (domain === 'duplicate') {
      return NextResponse.json({ error: `slug "${body.slug}" is already used` }, { status: 409 });
    }
    return NextResponse.json({ data: domain, local: true });
  }

  try {
    if (body.slug) {
      const existing = await prisma.domains.findUnique({ where: { slug: body.slug } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: `slug "${body.slug}" is already used` }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.cover_image !== undefined) updateData.cover_image = body.cover_image;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;
    if (body.require_face_detection !== undefined) updateData.require_face_detection = body.require_face_detection;

    const domain = await prisma.domains.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: {
        id: domain.id,
        slug: domain.slug,
        name: domain.name,
        description: domain.description,
        icon: domain.icon,
        color: domain.color,
        cover_image: domain.cover_image,
        is_active: domain.is_active,
        sort_order: domain.sort_order,
        require_face_detection: domain.require_face_detection,
        created_at: domain.created_at.toISOString(),
        updated_at: domain.updated_at.toISOString(),
      },
    });
  } catch {
    if (!isLocalAdminStoreEnabled()) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    const domain = await updateLocalDomain(id, body);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    if (domain === 'duplicate') {
      return NextResponse.json({ error: `slug "${body.slug}" is already used` }, { status: 409 });
    }
    return NextResponse.json({ data: domain, local: true });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  if (isLocalAdminStoreEnabled()) {
    const deleted = await deleteLocalDomain(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }

  try {
    await prisma.domains.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    if (!isLocalAdminStoreEnabled()) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    const deleted = await deleteLocalDomain(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, local: true });
  }
}
