import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/domains
 * Public API: fetch all active domains, sorted by sort_order
 */
export async function GET() {
    const domains = await prisma.domains.findMany({
        where: { is_active: true },
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
        sort_order: d.sort_order,
        require_face_detection: d.require_face_detection,
    }));

    return NextResponse.json({ data: formatted });
}
