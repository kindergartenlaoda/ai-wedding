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
    userId,
    type,
    amount,
    description,
    generationId,
    orderId,
    inviteEventId,
    metadata,
    createdBy,
  } = input;

  return await prisma.$transaction(async (tx) => {
    // 1. 获取当前用户积分
    const profile = await tx.profile.findUnique({
      where: { userId },
      select: { credits: true },
    });

    if (!profile) {
      throw new Error('用户不存在');
    }

    const balanceBefore = profile.credits;
    const balanceAfter = balanceBefore + amount;

    // 2. 验证余额充足（如果是扣款）
    if (amount < 0 && balanceAfter < 0) {
      throw new Error('积分不足');
    }

    // 3. 创建事务记录
    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        type,
        status: 'completed',
        amount,
        balanceBefore,
        balanceAfter,
        generationId,
        orderId,
        inviteEventId,
        description,
        metadata: (metadata as Prisma.InputJsonValue) || undefined,
        createdBy,
        completedAt: new Date(),
      },
    });

    // 4. 更新用户积分
    await tx.profile.update({
      where: { userId },
      data: { credits: balanceAfter },
    });

    return transaction;
  });
}

/**
 * 消费积分（生成图片）
 */
export async function deductCreditsForGeneration(
  userId: string,
  generationId: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    userId,
    type: 'generation',
    amount: -Math.abs(amount), // 确保是负数
    generationId,
    description: description || `生成图片消费 ${amount} 积分`,
  });
}

/**
 * 退款积分（生成失败）
 */
export async function refundCreditsForGeneration(
  userId: string,
  generationId: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    userId,
    type: 'refund',
    amount: Math.abs(amount), // 确保是正数
    generationId,
    description: description || `生成失败退款 ${amount} 积分`,
  });
}

/**
 * 充值积分（购买）
 */
export async function addCreditsForPurchase(
  userId: string,
  orderId: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    userId,
    type: 'purchase',
    amount: Math.abs(amount), // 确保是正数
    orderId,
    description: description || `购买充值 ${amount} 积分`,
  });
}

/**
 * 邀请奖励积分
 */
export async function addCreditsForInviteReward(
  userId: string,
  inviteEventId: string,
  amount: number,
  description?: string
) {
  return await createCreditTransaction({
    userId,
    type: 'invite_reward',
    amount: Math.abs(amount), // 确保是正数
    inviteEventId,
    description: description || `邀请好友奖励 ${amount} 积分`,
  });
}

/**
 * 系统赠送积分
 */
export async function grantCreditsFromSystem(
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
) {
  return await createCreditTransaction({
    userId,
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
  userId: string,
  adminId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
) {
  return await createCreditTransaction({
    userId,
    type: 'admin_adjust',
    amount, // 可以是正数或负数
    description,
    metadata,
    createdBy: adminId,
  });
}

/**
 * 获取用户积分流水
 */
export async function getUserCreditTransactions(
  userId: string,
  options: {
    type?: CreditTransactionType;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { type, limit = 20, offset = 0 } = options;

  const where: {
    userId: string;
    type?: CreditTransactionType;
  } = { userId };

  if (type) {
    where.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.creditTransaction.count({ where }),
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
export async function getUserCreditBalance(userId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { credits: true },
  });

  return profile?.credits ?? 0;
}

/**
 * 验证用户积分是否充足
 */
export async function hasEnoughCredits(
  userId: string,
  requiredAmount: number
): Promise<boolean> {
  const balance = await getUserCreditBalance(userId);
  return balance >= requiredAmount;
}
