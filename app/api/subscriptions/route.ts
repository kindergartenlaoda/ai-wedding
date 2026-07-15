import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { addCreditsForPurchase } from '@/lib/credit-service';
import {
  createLocalOrder,
  createLocalSubscription,
  getActiveLocalSubscription,
  isLocalFeatureStoreEnabled,
} from '@/lib/local-feature-store';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  monthlyCredits: number;
  durationMonths: number;
}

const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    name: '月度会员',
    price: 29.99,
    monthlyCredits: 100,
    durationMonths: 1,
  },
  yearly: {
    id: 'yearly',
    name: '年度会员',
    price: 199.99,
    monthlyCredits: 150,
    durationMonths: 12,
  },
};

/**
 * GET /api/subscriptions
 * Get current user's active subscription.
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  if (isLocalFeatureStoreEnabled(user_id)) {
    const subscription = await getActiveLocalSubscription(user_id);
    return NextResponse.json({
      subscription,
      plans: SUBSCRIPTION_PLANS,
      local: true,
    });
  }

  const subscription = await prisma.subscriptions.findFirst({
    where: {
      user_id,
      status: 'active',
      expires_at: { gt: new Date() },
    },
    orderBy: { expires_at: 'desc' },
  });

  return NextResponse.json({
    subscription,
    plans: SUBSCRIPTION_PLANS,
  });
}

/**
 * POST /api/subscriptions
 * Create a new subscription (mock payment for now).
 * Body: { plan: "monthly" | "yearly" }
 */
export async function POST(req: NextRequest) {
  // 环境保护：仅在 mock 模式下可用
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'mock';
  if (paymentProvider !== 'mock') {
    return NextResponse.json(
      { error: 'Mock subscription is not available in production. Please contact support.' },
      { status: 501 }
    );
  }

  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const user_id = authResult.user.id;

  const body = await req.json();
  const { plan: planBody, plan_id } = body as { plan?: string; plan_id?: string };
  const planId = planBody || plan_id;

  if (!planId || !SUBSCRIPTION_PLANS[planId]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const plan = SUBSCRIPTION_PLANS[planId];

  if (isLocalFeatureStoreEnabled(user_id)) {
    const existingSub = await getActiveLocalSubscription(user_id);
    if (existingSub) {
      return NextResponse.json(
        { error: 'Active subscription already exists' },
        { status: 409 }
      );
    }

    await createLocalOrder({
      userId: user_id,
      amount: plan.price,
      currency: 'USD',
      paymentMethod: 'local-mock',
      credits: plan.monthlyCredits,
      status: 'completed',
    });
    const subscription = await createLocalSubscription({
      userId: user_id,
      plan: plan.id,
      monthlyCredits: plan.monthlyCredits,
      durationMonths: plan.durationMonths,
    });

    return NextResponse.json({
      ok: true,
      subscription,
      creditsAdded: plan.monthlyCredits,
      local: true,
    });
  }

  const existingSub = await prisma.subscriptions.findFirst({
    where: {
      user_id,
      status: 'active',
      expires_at: { gt: new Date() },
    },
  });

  if (existingSub) {
    return NextResponse.json(
      { error: '您已有活跃订阅，请等待到期后再续订' },
      { status: 409 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + plan.durationMonths);

  const order = await prisma.orders.create({
    data: {
      user_id,
      amount: plan.price,
      currency: 'USD',
      status: 'completed',
      payment_method: 'mock',
    },
  });

  const subscription = await prisma.subscriptions.create({
    data: {
      user_id,
      plan: plan.id,
      status: 'active',
      monthly_credits: plan.monthlyCredits,
      started_at: now,
      expires_at: expiresAt,
    },
  });

  await addCreditsForPurchase(
    user_id,
    order.id,
    plan.monthlyCredits,
    `${plan.name}订阅首月积分 ${plan.monthlyCredits}`
  );

  return NextResponse.json({
    ok: true,
    subscription,
    creditsAdded: plan.monthlyCredits,
  });
}
