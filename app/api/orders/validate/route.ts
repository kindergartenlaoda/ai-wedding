import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { getLocalOrderById, isLocalFeatureStoreEnabled } from '@/lib/local-feature-store';
import { prisma } from '@/lib/prisma';
import { CreateOrderSchema, validateData } from '@/lib/validations';

export async function GET(req: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
  }

  if (isLocalFeatureStoreEnabled(user_id)) {
    const order = await getLocalOrderById(orderId, user_id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({
      order_id: order.id,
      status: order.status,
      credits: order.credits,
      local: true,
    });
  }

  const order = await prisma.orders.findFirst({
    where: { id: orderId, user_id },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      payment_intent_id: true,
      updated_at: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({
    order_id: order.id,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    payment_intent_id: order.payment_intent_id,
    updated_at: order.updated_at.toISOString(),
  });
}

/**
 * 订单验证API - 在创建订单前验证数据
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateData(CreateOrderSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      data: validation.data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
