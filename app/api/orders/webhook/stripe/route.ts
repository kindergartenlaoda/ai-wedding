import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const CREDITS_BY_AMOUNT: Record<string, number> = {
  '19.99': 50,
  '49.99': 150,
  '99.99': 400,
};

export async function POST(req: Request) {
  try {
    if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
      logger.error('Stripe not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const raw = await req.text();
    const sigHeader = req.headers.get('stripe-signature');

    if (!sigHeader) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sigHeader, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signature verification failed';
      logger.error({ error: msg }, 'Webhook signature verification failed');
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      const creditsFromMeta = session.metadata?.credits;

      if (!orderId) {
        logger.warn({ sessionId: session.id }, 'Webhook: no order_id in metadata');
        return NextResponse.json({ ok: true, message: 'No order_id in metadata' });
      }

      const order = await prisma.orders.findUnique({ where: { id: orderId } });
      if (!order) {
        logger.warn({ orderId }, 'Webhook: order not found');
        return NextResponse.json({ ok: true, message: 'Order not found' });
      }

      // Atomic idempotency: single UPDATE with WHERE status != 'completed' prevents
      // double-processing when Stripe retries the webhook concurrently.
      const updated = await prisma.orders.updateMany({
        where: { id: orderId, status: { not: 'completed' } },
        data: {
          status: 'completed',
          payment_intent_id: (session.payment_intent as string) || session.id,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ ok: true, message: 'Already completed' });
      }

      const creditsToAdd = creditsFromMeta
        ? parseInt(creditsFromMeta, 10)
        : CREDITS_BY_AMOUNT[String(order.amount)] || 0;

      if (creditsToAdd > 0) {
        await prisma.$transaction(async (tx) => {
          const profile = await tx.profiles.findUnique({
            where: { user_id: order.user_id },
          });
          if (!profile) return;

          await tx.profiles.update({
            where: { user_id: order.user_id },
            data: { credits: { increment: creditsToAdd } },
          });

          await tx.credit_transactions.create({
            data: {
              user_id: order.user_id,
              type: 'purchase',
              status: 'completed',
              amount: creditsToAdd,
              balance_before: profile.credits,
              balance_after: profile.credits + creditsToAdd,
              order_id: orderId,
              description: `购买积分 (${session.metadata?.plan || 'unknown'} 套餐)`,
            },
          });
        });
      }

      logger.info({ orderId, creditsToAdd }, 'Webhook: order completed');
      return NextResponse.json({ ok: true, order_id: orderId, creditsAdded: creditsToAdd });
    }

    return NextResponse.json({ ok: true, message: `Unhandled event: ${event.type}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    logger.error({ error: message }, 'Webhook processing failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
