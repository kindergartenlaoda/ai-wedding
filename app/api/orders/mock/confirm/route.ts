import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { addCreditsForPurchase } from '@/lib/credit-service';

export const runtime = 'nodejs';

const CREDITS_BY_AMOUNT: Record<string, number> = {
  '19.99': 50,
  '49.99': 150,
  '99.99': 400,
};

/**
 * POST /api/orders/mock/confirm
 * Mock payment confirmation endpoint (dev/test only).
 * Body: { payment_intent_id: string }
 */
export async function POST(req: Request) {
  // 环境保护：仅在 mock 模式下可用
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'mock';
  if (paymentProvider !== 'mock') {
    return NextResponse.json(
      { error: 'Mock payment is not available in production. Please contact support.' },
      { status: 501 }
    );
  }
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const body = (await req.json()) as { payment_intent_id?: string };
    const pid = body?.payment_intent_id;
    if (!pid) return NextResponse.json({ error: 'Missing payment_intent_id' }, { status: 400 });

    const order = await prisma.orders.findFirst({
      where: { payment_intent_id: pid },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.user_id !== user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (order.status === 'completed') {
      return NextResponse.json({ ok: true, message: 'Already completed' }, { status: 200 });
    }

    await prisma.orders.update({
      where: { id: order.id },
      data: { status: 'completed' },
    });

    const amountStr = String(order.amount);
    const creditsToAdd = CREDITS_BY_AMOUNT[amountStr] || 0;
    if (creditsToAdd > 0) {
      await addCreditsForPurchase(
        order.user_id,
        order.id,
        creditsToAdd,
        `购买积分 (Mock 支付, ${creditsToAdd} 积分)`
      );
    }

    return NextResponse.json({ ok: true, creditsAdded: creditsToAdd });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
