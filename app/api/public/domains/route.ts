import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listLocalDomains } from '@/lib/local-admin-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/domains
 * Public API: fetch all active domains from admin-managed domains table
 * Returns only domains where is_active = true, sorted by sort_order
 */
export async function GET() {
    if (process.env.LOCAL_ADMIN_MODE === 'true') {
        const domains = await listLocalDomains();
        return NextResponse.json({
            data: domains.filter((domain) => domain.is_active),
            fallback: true,
            local: true,
        });
    }

    try {
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
    } catch (error) {
        console.error('[API] Failed to fetch public domains:', error);

        // Return stable contract with empty data on error
        return NextResponse.json(
            {
                data: [],
                error: 'Failed to load domains. Please try again later.'
            },
            { status: 500 }
        );
    }
}
