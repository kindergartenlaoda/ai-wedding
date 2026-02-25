import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/domains/[id]
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const domain = await prisma.domains.findUnique({ where: { id } });

    if (!domain) {
        return NextResponse.json({ error: '域不存在' }, { status: 404 });
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
}

/**
 * PATCH /api/admin/domains/[id]
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;
    const body = await req.json();

    // Check slug uniqueness if slug is being updated
    if (body.slug) {
        const existing = await prisma.domains.findUnique({ where: { slug: body.slug } });
        if (existing && existing.id !== id) {
            return NextResponse.json(
                { error: `slug "${body.slug}" 已被其他域使用` },
                { status: 409 }
            );
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

    try {
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
        return NextResponse.json({ error: '域不存在' }, { status: 404 });
    }
}

/**
 * DELETE /api/admin/domains/[id]
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    const { id } = await params;

    try {
        await prisma.domains.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: '域不存在' }, { status: 404 });
    }
}
