// Stripe Webhook 骨架（签名校验 + 重放保护 + 幂等处理）
// 提示：生产环境请使用真实 Stripe SDK；此处为通用 HMAC 验证示例

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; // Stripe Endpoint Secret

// 金额到积分的简单映射（示例）
const CREDITS_BY_AMOUNT: Record<string, number> = {
  '19.99': 50,
  '49.99': 150,
  '99.99': 400,
};

function parseStripeSignature(sigHeader: string | null) {
  if (!sigHeader) return null;
  const parts = sigHeader.split(',');
  const out: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) out[k.trim()] = v.trim();
  }
  const t = out['t'];
  const v1 = out['v1'];
  if (!t || !v1) return null;
  return { t, v1 };
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: Request) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const raw = await req.text(); // 获取原始请求体
    const sigHeader = req.headers.get('stripe-signature') || req.headers.get('Stripe-Signature');
    const parsed = parseStripeSignature(sigHeader);
    if (!parsed) return NextResponse.json({ error: 'Bad signature header' }, { status: 400 });

    const { t, v1 } = parsed;
    // 重放保护：5 分钟容差
    const ts = Number(t);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return NextResponse.json({ error: 'Timestamp outside tolerance' }, { status: 400 });
    }

    const payload = `${t}.${raw}`;
    const expected = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(payload, 'utf8').digest('hex');
    if (!safeEqual(expected, v1)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 签名通过，解析事件
    const event = JSON.parse(raw);
    const type: string | undefined = event?.type;
    const obj = event?.data?.object;

    // 仅处理成功支付相关事件（示例）
    let payment_intent_id: string | undefined;
    if (type === 'payment_intent.succeeded') {
      payment_intent_id = obj?.id;
    } else if (type === 'checkout.session.completed') {
      payment_intent_id = obj?.payment_intent || obj?.id;
    } else {
      // 忽略其他事件
      return NextResponse.json({ ok: true });
    }

    // 依据 payment_intent_id 定位订单；若为空或未命中，可尝试使用 metadata.order_id
    let order = await prisma.orders.findFirst({
      where: { payment_intent_id: payment_intent_id || '' },
    });

    if (!order && obj?.metadata?.order_id) {
      order = await prisma.orders.findUnique({
        where: { id: obj.metadata.order_id },
      });
      // 若找到但尚未写入 payment_intent_id，则补充写入
      if (order && !order.payment_intent_id && payment_intent_id) {
        await prisma.orders.update({
          where: { id: order.id },
          data: { payment_intent_id },
        });
      }
    }

    if (!order) {
      // 未匹配到订单：记录后返回 200，避免重复重试
      return NextResponse.json({ ok: true, message: 'Order not found for event' });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ ok: true, message: 'Already completed' });
    }

    // 更新订单状态
    await prisma.orders.update({
      where: { id: order.id },
      data: { status: 'completed' },
    });

    // 发放积分（基于订单金额映射）
    const creditsToAdd = CREDITS_BY_AMOUNT[String(order.amount)] || 0;
    if (creditsToAdd > 0) {
      const profile = await prisma.profiles.findUnique({
        where: { user_id: order.user_id },
      });
      if (profile) {
        const newCredits = profile.credits + creditsToAdd;
        await prisma.profiles.update({
          where: { user_id: order.user_id },
          data: { credits: newCredits },
        });
      }
    }

    return NextResponse.json({ ok: true, order_id: order.id, creditsAdded: creditsToAdd });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
