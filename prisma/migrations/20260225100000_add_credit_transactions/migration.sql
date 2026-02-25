-- Migration: Add Credit Transaction System
-- Date: 2026-02-25
-- Description:
--   1. Create credit transaction enums (type and status)
--   2. Create credit_transactions table
--   3. Add indexes for performance
--   4. Add comments for documentation

-- Step 1: Create credit transaction type enum
CREATE TYPE "CreditTransactionType" AS ENUM (
  'purchase',        -- 购买充值
  'generation',      -- 生成消费
  'refund',          -- 退款
  'invite_reward',   -- 邀请奖励
  'system_grant',    -- 系统赠送
  'admin_adjust'     -- 管理员调整
);

-- Step 2: Create credit transaction status enum
CREATE TYPE "CreditTransactionStatus" AS ENUM (
  'pending',    -- 待处理
  'completed',  -- 已完成
  'failed',     -- 失败
  'cancelled'   -- 已取消
);

-- Step 3: Create credit_transactions table
CREATE TABLE "credit_transactions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "type" "CreditTransactionType" NOT NULL,
  "status" "CreditTransactionStatus" NOT NULL DEFAULT 'pending',
  "amount" INTEGER NOT NULL,
  "balance_before" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,

  -- 关联信息
  "generation_id" TEXT,
  "order_id" TEXT,
  "invite_event_id" TEXT,

  -- 元数据
  "description" TEXT,
  "metadata" JSONB,

  -- 审计信息
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "credit_transactions_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Step 4: Create indexes
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");
CREATE INDEX "credit_transactions_status_idx" ON "credit_transactions"("status");
CREATE INDEX "credit_transactions_generation_id_idx" ON "credit_transactions"("generation_id");
CREATE INDEX "credit_transactions_order_id_idx" ON "credit_transactions"("order_id");
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");

-- Step 5: Add comments
COMMENT ON TABLE "credit_transactions" IS 'Credit transaction records for audit and reconciliation';
COMMENT ON COLUMN "credit_transactions"."amount" IS 'Positive for credit, negative for debit';
COMMENT ON COLUMN "credit_transactions"."balance_before" IS 'User credit balance before this transaction';
COMMENT ON COLUMN "credit_transactions"."balance_after" IS 'User credit balance after this transaction';
COMMENT ON COLUMN "credit_transactions"."generation_id" IS 'Related generation record (for generation type)';
COMMENT ON COLUMN "credit_transactions"."order_id" IS 'Related order record (for purchase type)';
COMMENT ON COLUMN "credit_transactions"."invite_event_id" IS 'Related invite event (for invite_reward type)';
COMMENT ON COLUMN "credit_transactions"."metadata" IS 'Additional metadata in JSON format';
COMMENT ON COLUMN "credit_transactions"."created_by" IS 'Creator user ID (for admin_adjust type)';
