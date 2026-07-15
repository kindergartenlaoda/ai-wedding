import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { isLocalFeatureStoreEnabled, listLocalPromptGenerations } from '@/lib/local-feature-store';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  if (isLocalFeatureStoreEnabled(user.id)) {
    const { records, total } = await listLocalPromptGenerations(user.id, limit, offset);
    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      local: true,
    });
  }

  const [records, total] = await Promise.all([
    prisma.prompt_generations.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.prompt_generations.count({
      where: { user_id: user.id },
    }),
  ]);

  return NextResponse.json({
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
