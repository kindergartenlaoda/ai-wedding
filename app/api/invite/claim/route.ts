import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { invitee_id, ref_code } = (await req.json()) as { invitee_id?: string; ref_code?: string };
    if (!invitee_id || !ref_code) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // 查询邀请人（通过 invite_code）
    const inviter = await prisma.profiles.findFirst({
      where: { invite_code: ref_code },
    });
    if (!inviter) {
      return new Response(JSON.stringify({ error: 'Invalid referrer code' }), { status: 400 });
    }

    const INVITER_REWARD = 30;
    const INVITEE_REWARD = 20;

    // 查询被邀请人 profile（invitee_id 为 user id）
    const invitee = await prisma.profiles.findUnique({
      where: { user_id: invitee_id },
    });
    if (!invitee) {
      return new Response(JSON.stringify({ error: 'Invitee profile not found' }), { status: 400 });
    }
    if (invitee.invited_by) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    await prisma.$transaction([
      prisma.profiles.update({
        where: { id: inviter.id },
        data: {
          credits: inviter.credits + INVITER_REWARD,
          invite_count: inviter.invite_count + 1,
          reward_credits: inviter.reward_credits + INVITER_REWARD,
        },
      }),
      prisma.profiles.update({
        where: { user_id: invitee_id },
        data: {
          credits: invitee.credits + INVITEE_REWARD + 50, // 新用户基础 50 + 奖励
          invited_by: ref_code,
        },
      }),
      prisma.invite_events.create({
        data: {
          inviter_id: inviter.user_id,
          invitee_id: invitee_id,
          inviter_code: ref_code,
          reward_credits: INVITER_REWARD,
        },
      }),
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
