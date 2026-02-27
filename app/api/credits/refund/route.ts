import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { refundCreditsForGeneration } from '@/lib/credit-service';

/**
 * POST /api/credits/refund
 * Refund credits and optionally mark generation as failed.
 * All credit changes go through credit-service for audit trail.
 * Body: { credits, generation_id?, error_message? }
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const { credits, generation_id, error_message } = body as {
    credits?: number;
    generation_id?: string;
    error_message?: string;
  };

  if (typeof credits !== 'number' || credits <= 0) {
    return NextResponse.json({ error: 'Invalid credits' }, { status: 400 });
  }

  try {
    // 使用事务确保退款和状态更新的原子性
    await prisma.$transaction(async (tx) => {
      // 1. 退款积分
      await refundCreditsForGeneration(
        user_id,
        generation_id ?? '',
        credits,
        generation_id ? `生成失败退款 ${credits} 积分` : `退款 ${credits} 积分`
      );

      // 2. 如果有 generation_id，更新生成状态
      if (generation_id) {
        const gen = await tx.generations.findFirst({
          where: { id: generation_id, user_id },
        });
        if (gen) {
          await tx.generations.update({
            where: { id: generation_id },
            data: {
              status: 'failed',
              error_message: error_message || '生成失败',
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Refund failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
