import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { invitee_id, ref_code } = (await req.json()) as { invitee_id?: string; ref_code?: string };
    if (!invitee_id || !ref_code) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    // 查询邀请人（通过 invite_code）
    const inviter = await prisma.profile.findFirst({
      where: { inviteCode: ref_code },
    });
    if (!inviter) {
      return new Response(JSON.stringify({ error: 'Invalid referrer code' }), { status: 400 });
    }

    const INVITER_REWARD = 30;
    const INVITEE_REWARD = 20;

    // 查询被邀请人 profile（invitee_id 为 user id）
    const invitee = await prisma.profile.findUnique({
      where: { userId: invitee_id },
    });
    if (!invitee) {
      return new Response(JSON.stringify({ error: 'Invitee profile not found' }), { status: 400 });
    }
    if (invitee.invitedBy) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    await prisma.$transaction([
      prisma.profile.update({
        where: { id: inviter.id },
        data: {
          credits: inviter.credits + INVITER_REWARD,
          inviteCount: inviter.inviteCount + 1,
          rewardCredits: inviter.rewardCredits + INVITER_REWARD,
        },
      }),
      prisma.profile.update({
        where: { userId: invitee_id },
        data: {
          credits: invitee.credits + INVITEE_REWARD + 50, // 新用户基础 50 + 奖励
          invitedBy: ref_code,
        },
      }),
      prisma.inviteEvent.create({
        data: {
          inviterId: inviter.userId,
          inviteeId: invitee_id,
          inviterCode: ref_code,
          rewardCredits: INVITER_REWARD,
        },
      }),
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
