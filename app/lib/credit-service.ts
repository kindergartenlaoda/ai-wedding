/**
 * 积分服务 - 统一管理所有积分操作
 *
 * 核心原则：
 * 1. 所有积分变动必须通过此服务
 * 2. 使用数据库事务确保原子性
 * 3. 记录完整的事务流水
 * 4. 支持审计和回滚
 */

import { prisma } from './prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { CreditTransactionType, CreateCreditTransactionInput } from '@/types/credit';

/**
 * 创建积分事务并更新用户余额
 *
 * @param input - 事务输入参数
 * @returns 事务记录
 */
export async function createCreditTransaction(input: CreateCreditTransactionInput) {
  const {
    user_id,
    type,
    amount,
    description,
    generation_id,
    order_id,
    invite_event_id,
    metadata,
    created_by,
  } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. 获取当前用户积分
    const profile = await tx.profiles.findUnique({
      where: { user_id },
      select: { credits: true },
    });

    if (!profile) {
      throw new Error('用户不存在');
    }

    const balance_before = profile.credits;
    const balance_after = balance_before + amount;

    // 2. 验证余额充足（如果是扣款）
    if (amount < 0 && balance_after < 0) {
      throw new Error('积分不足');
    }

    // 3. 创建事务记录
    const transaction = await tx.credit_transactions.create({
      data: {
        user_id,
        type,
        status: 'completed',
        amount,
        balance_before,
        balance_after,
        generation_id,
        order_id,
        invite_event_id,
        description,
        metadata: (metadata as Prisma.InputJsonValue) || undefined,
        created_by,
        completed_at: new Date(),
      },
    });

    // 4. 更新用户积分
    await tx.profiles.update({
      where: { user_id },
      data: { credits: balance_after },
    });

    return transaction;
  });
}

/**
 * 消费积分（生成图片）
 */
export async function deductCreditsForGeneration(
  user_id: string,
  generation_id: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    user_id,
    type: 'generation',
    amount: -Math.abs(amount), // 确保是负数
    generation_id,
    description: description || `生成图片消费 ${amount} 积分`,
  });
}

/**
 * 退款积分（生成失败）
 */
export async function refundCreditsForGeneration(
  user_id: string,
  generation_id: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    user_id,
    type: 'refund',
    amount: Math.abs(amount), // 确保是正数
    generation_id,
    description: description || `生成失败退款 ${amount} 积分`,
  });
}

/**
 * 充值积分（购买）
 */
export async function addCreditsForPurchase(
  user_id: string,
  order_id: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    user_id,
    type: 'purchase',
    amount: Math.abs(amount), // 确保是正数
    order_id,
    description: description || `购买充值 ${amount} 积分`,
  });
}

/**
 * 邀请奖励积分
 */
export async function addCreditsForInviteReward(
  user_id: string,
  invite_event_id: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    user_id,
    type: 'invite_reward',
    amount: Math.abs(amount), // 确保是正数
    invite_event_id,
    description: description || `邀请好友奖励 ${amount} 积分`,
  });
}

/**
 * 系统赠送积分
 */
export async function grantCreditsFromSystem(
  user_id: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
) {
  return await createCreditTransaction({
    user_id,
    type: 'system_grant',
    amount: Math.abs(amount), // 确保是正数
    description,
    metadata,
  });
}

/**
 * 管理员调整积分
 */
export async function adjustCreditsByAdmin(
  user_id: string,
  adminId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
) {
  return await createCreditTransaction({
    user_id,
    type: 'admin_adjust',
    amount, // 可以是正数或负数
    description,
    metadata,
    created_by: adminId,
  });
}

/**
 * 获取用户积分流水
 */
export async function getUserCreditTransactions(
  user_id: string,
  options: {
    type?: CreditTransactionType;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { type, limit = 20, offset = 0 } = options;

  const where: {
    user_id: string;
    type?: CreditTransactionType;
  } = { user_id };

  if (type) {
    where.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.credit_transactions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.credit_transactions.count({ where }),
  ]);

  return {
    transactions,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * 获取用户当前积分余额
 */
export async function getUserCreditBalance(user_id: string): Promise<number> {
  const profile = await prisma.profiles.findUnique({
    where: { user_id },
    select: { credits: true },
  });

  return profile?.credits ?? 0;
}

/**
 * 验证用户积分是否充足
 */
export async function hasEnoughCredits(
  user_id: string,
  requiredAmount: number
): Promise<boolean> {
  const balance = await getUserCreditBalance(user_id);
  return balance >= requiredAmount;
}
