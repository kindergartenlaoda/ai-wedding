import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'mock';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const PLAN_MAP = {
  Starter: { amount: 19.99, credits: 50, label: 'Starter · 50 积分' },
  Popular: { amount: 49.99, credits: 150, label: 'Popular · 150 积分' },
  Premium: { amount: 99.99, credits: 400, label: 'Premium · 400 积分' },
} as const;

type PlanKey = keyof typeof PLAN_MAP;

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const user_id = authResult.user.id;

    const body = (await req.json()) as { plan: PlanKey };
    const planKey = body?.plan;
    if (!planKey || !(planKey in PLAN_MAP)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const plan = PLAN_MAP[planKey];
    const currency = 'USD';

    const order = await prisma.orders.create({
      data: {
        user_id,
        amount: plan.amount,
        currency,
        status: 'pending',
        payment_method: PAYMENT_PROVIDER,
      },
    });

    if (PAYMENT_PROVIDER === 'stripe') {
      if (!STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: 'Stripe not configured: STRIPE_SECRET_KEY missing' },
          { status: 501 }
        );
      }

      try {
        const stripe = new Stripe(STRIPE_SECRET_KEY);

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency,
                unit_amount: Math.round(plan.amount * 100),
                product_data: { name: plan.label },
              },
              quantity: 1,
            },
          ],
          success_url: `${SITE_URL}/dashboard?paid=1&oid=${order.id}`,
          cancel_url: `${SITE_URL}/pricing?canceled=1`,
          metadata: { order_id: order.id, plan: planKey, credits: String(plan.credits) },
        });

        await prisma.orders.update({
          where: { id: order.id },
          data: { payment_intent_id: session.id },
        });

        return NextResponse.json({
          order_id: order.id,
          payment_intent_id: session.id,
          checkout_url: session.url,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Stripe create session failed';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    // Mock provider
    const payment_intent_id = crypto.randomUUID();
    await prisma.orders.update({
      where: { id: order.id },
      data: { payment_intent_id },
    });

    return NextResponse.json({
      order_id: order.id,
      payment_intent_id,
      checkout_url: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
