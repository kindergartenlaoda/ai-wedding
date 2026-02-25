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

    const domains = await prisma.domain.findMany({
        orderBy: { sortOrder: 'asc' },
    });

    const formatted = domains.map((d) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        description: d.description,
        icon: d.icon,
        color: d.color,
        cover_image: d.coverImage,
        is_active: d.isActive,
        sort_order: d.sortOrder,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
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
    const existing = await prisma.domain.findUnique({ where: { slug: body.slug } });
    if (existing) {
        return NextResponse.json(
            { error: `slug "${body.slug}" 已存在` },
            { status: 409 }
        );
    }

    const domain = await prisma.domain.create({
        data: {
            slug: body.slug,
            name: body.name,
            description: body.description || '',
            icon: body.icon || 'Camera',
            color: body.color || 'from-pink-500 to-rose-500',
            coverImage: body.cover_image || null,
            isActive: body.is_active !== undefined ? body.is_active : true,
            sortOrder: body.sort_order ?? 0,
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
            cover_image: domain.coverImage,
            is_active: domain.isActive,
            sort_order: domain.sortOrder,
            created_at: domain.createdAt.toISOString(),
            updated_at: domain.updatedAt.toISOString(),
        },
    }, { status: 201 });
}
