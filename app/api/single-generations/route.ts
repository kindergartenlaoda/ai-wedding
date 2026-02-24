import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/single-generations
 * Create a single generation record (from generate-single flow)
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const userId = authResult.user.id;

  const body = await req.json();
  const {
    prompt,
    original_image,
    result_image,
    settings,
    credits_used = 15,
  } = body as {
    prompt?: string;
    original_image?: string;
    result_image?: string;
    settings?: object;
    credits_used?: number;
  };

  if (!prompt || !original_image || !result_image) {
    return NextResponse.json(
      { error: 'Missing prompt, original_image, or result_image' },
      { status: 400 }
    );
  }

  const record = await prisma.singleGeneration.create({
    data: {
      userId,
      prompt,
      originalImage: original_image,
      resultImage: result_image,
      settings: (settings || {}) as object,
      creditsUsed: credits_used,
    },
  });

  return NextResponse.json({
    id: record.id,
    created_at: record.createdAt.toISOString(),
  }, { status: 201 });
}
