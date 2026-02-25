import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const CREDITS_BY_AMOUNT: Record<string, number> = {
  '19.99': 50,
  '49.99': 150,
  '99.99': 400,
};

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const body = (await req.json()) as { payment_intent_id?: string };
    const pid = body?.payment_intent_id;
    if (!pid) return NextResponse.json({ error: 'Missing payment_intent_id' }, { status: 400 });

    // 1) 读取订单并校验归属
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

    // 2) 标记订单完成
    await prisma.orders.update({
      where: { id: order.id },
      data: { status: 'completed' },
    });

    // 3) 按金额映射增加积分
    const amountStr = String(order.amount);
    const creditsToAdd = CREDITS_BY_AMOUNT[amountStr] || 0;
    if (creditsToAdd > 0) {
      const profile = await prisma.profiles.findUnique({
        where: { user_id: order.user_id },
      });
      if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 500 });

      const newCredits = profile.credits + creditsToAdd;
      await prisma.profiles.update({
        where: { user_id: order.user_id },
        data: { credits: newCredits },
      });
    }

    return NextResponse.json({ ok: true, creditsAdded: creditsToAdd });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
