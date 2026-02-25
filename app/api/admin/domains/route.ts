import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/domains
 * Fetch all domains (including inactive) for admin management
 */
export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    const domains = await prisma.domains.findMany({
        orderBy: { sort_order: 'asc' },
    });

    const formatted = domains.map((d) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        icon: d.icon,
        color: d.color,
        cover_image: d.cover_image,
        is_active: d.is_active,
        sort_order: d.sort_order,
        require_face_detection: d.require_face_detection,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
    }));

    return NextResponse.json({ data: formatted, total: formatted.length });
}

/**
 * POST /api/admin/domains
 * Create a new domain
 */
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof Response) return authResult;

    const body = await req.json();

    if (!body.slug || !body.name) {
        return NextResponse.json(
            { error: '缺少必填字段: slug, name' },
            { status: 400 }
        );
    }

    // Check slug uniqueness
    const existing = await prisma.domains.findUnique({ where: { slug: body.slug } });
    if (existing) {
        return NextResponse.json(
            { error: `slug "${body.slug}" 已存在` },
            { status: 409 }
        );
    }

    const domain = await prisma.domains.create({
        data: {
            slug: body.slug,
            name: body.name,
            description: body.description || '',
            icon: body.icon || 'Camera',
            color: body.color || 'from-pink-500 to-rose-500',
            cover_image: body.cover_image || null,
            is_active: body.is_active !== undefined ? body.is_active : true,
            sort_order: body.sort_order ?? 0,
            require_face_detection: body.require_face_detection !== undefined ? body.require_face_detection : false,
        },
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
    }, { status: 201 });
}
