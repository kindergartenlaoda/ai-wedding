import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';
import { addCreditsForInviteReward } from '@/lib/credit-service';

/**
 * POST /api/invite/claim
 * Claim invite reward (requires authentication).
 * Body: { ref_code: string }
 */
export async function POST(req: NextRequest) {
  // 1. 验证身份：确保调用者已登录
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const invitee_id = authResult.user.id;

  try {
    const { ref_code } = (await req.json()) as { ref_code?: string };
    if (!ref_code) {
      return NextResponse.json({ error: 'Missing ref_code' }, { status: 400 });
    }

    if (process.env.LOCAL_ADMIN_MODE === 'true' && invitee_id === 'local-admin') {
      return NextResponse.json({ ok: true, skipped: true, local: true }, { status: 200 });
    }

    // 2. 使用事务确保原子性，防止竞态条件
    const result = await prisma.$transaction(async (tx) => {
      // 2.1 查找邀请人
      const inviter = await tx.profiles.findFirst({
        where: { invite_code: ref_code },
      });
      if (!inviter) {
        throw new Error('Invalid referrer code');
      }

      // 2.2 防止自己邀请自己
      if (inviter.user_id === invitee_id) {
        throw new Error('Cannot invite yourself');
      }

      // 2.3 查找被邀请人并检查是否已领取
      const invitee = await tx.profiles.findUnique({
        where: { user_id: invitee_id },
      });
      if (!invitee) {
        throw new Error('Invitee profile not found');
      }
      if (invitee.invited_by) {
        // 已领取过，直接返回成功（幂等性）
        return { ok: true, skipped: true };
      }

      const INVITER_REWARD = 30;
      const INVITEE_REWARD = 20;

      // 2.4 创建邀请事件记录
      const inviteEvent = await tx.invite_events.create({
        data: {
          inviter_id: inviter.user_id,
          invitee_id: invitee_id,
          inviter_code: ref_code,
          reward_credits: INVITER_REWARD,
        },
      });

      // 2.5 更新被邀请人的 invited_by 字段
      await tx.profiles.update({
        where: { user_id: invitee_id },
        data: { invited_by: ref_code },
      });

      // 2.6 更新邀请人的邀请计数和奖励积分
      await tx.profiles.update({
        where: { id: inviter.id },
        data: {
          invite_count: inviter.invite_count + 1,
          reward_credits: inviter.reward_credits + INVITER_REWARD,
        },
      });

      // 2.7 发放邀请人积分（credit-service 内部已有事务）
      await addCreditsForInviteReward(
        inviter.user_id,
        inviteEvent.id,
        INVITER_REWARD,
        `邀请好友奖励 ${INVITER_REWARD} 积分`
      );

      // 2.8 发放被邀请人积分
      await addCreditsForInviteReward(
        invitee_id,
        inviteEvent.id,
        INVITEE_REWARD,
        `受邀注册奖励 ${INVITEE_REWARD} 积分`
      );

      return { ok: true, skipped: false };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
