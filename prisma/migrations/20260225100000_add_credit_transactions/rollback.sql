-- Rollback Migration: Add Credit Transaction System
-- Date: 2026-02-25
-- Description: Rollback script to remove credit_transactions table and enums

-- Step 1: Drop credit_transactions table
DROP TABLE IF EXISTS "credit_transactions";

-- Step 2: Drop enums
DROP TYPE IF EXISTS "CreditTransactionStatus";
DROP TYPE IF EXISTS "CreditTransactionType";
