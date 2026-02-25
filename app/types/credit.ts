/**
 * 积分事务类型定义
 */

export type CreditTransactionType =
  | 'purchase'        // 购买充值
  | 'generation'      // 生成消费
  | 'refund'          // 退款
  | 'invite_reward'   // 邀请奖励
  | 'system_grant'    // 系统赠送
  | 'admin_adjust';   // 管理员调整

export type CreditTransactionStatus =
  | 'pending'    // 待处理
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'cancelled'; // 已取消

/**
 * 积分事务记录
 */
export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTransactionType;
  status: CreditTransactionStatus;
  amount: number;              // 正数=增加，负数=减少
  balance_before: number;      // 事务前余额
  balance_after: number;       // 事务后余额

  // 关联信息
  generation_id?: string | null;
  order_id?: string | null;
  invite_event_id?: string | null;

  // 元数据
  description?: string | null;
  metadata?: {
    [key: string]: unknown;
  } | null;

  // 审计信息
  created_by?: string | null;
  created_at: string;
  completed_at?: string | null;
}

/**
 * 创建积分事务的输入参数
 */
export interface CreateCreditTransactionInput {
  userId: string;
  type: CreditTransactionType;
  amount: number;
  description?: string;
  generationId?: string;
  orderId?: string;
  inviteEventId?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}
