import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/domains
 * Public API: fetch all active domains, sorted by sort_order
 */
export async function GET() {
    const domains = await prisma.domain.findMany({
        where: { isActive: true },
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
        sort_order: d.sortOrder,
    }));

    return NextResponse.json({ data: formatted });
}
