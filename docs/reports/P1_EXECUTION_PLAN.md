# P1 优化任务 - 执行计划

## 📋 任务概览

根据之前的产品优化分析，P1 优先级任务包括：

1. **增加积分事务表** ⭐⭐⭐⭐ (最高优先级)
2. **统一 Domain 系统** ⭐⭐⭐
3. **简化 Prompt 策略** ⭐⭐

---

## ✅ 任务 #1: 增加积分事务表 (进行中)

### 问题分析

**当前积分系统的问题**:
```typescript
// 当前实现：直接修改 Profile.credits
await prisma.profile.update({
  where: { userId },
  data: { credits: profile.credits - creditsUsed }
});

// 问题：
❌ 无法追踪积分变动历史
❌ 无法审计积分流水
❌ 退款逻辑不够健壮
❌ 无法对账
❌ 数据完整性风险
```

### 解决方案

**新的积分事务系统**:
```typescript
// 新实现：记录每一笔积分变动
await prisma.$transaction(async (tx) => {
  // 1. 获取当前余额
  const profile = await tx.profile.findUnique({ where: { userId } });

  // 2. 创建事务记录
  await tx.creditTransaction.create({
    data: {
      userId,
      type: 'generation',
      status: 'completed',
      amount: -creditsUsed,
      balanceBefore: profile.credits,
      balanceAfter: profile.credits - creditsUsed,
      generationId,
      description: '生成图片消费积分'
    }
  });

  // 3. 更新余额
  await tx.profile.update({
    where: { userId },
    data: { credits: profile.credits - creditsUsed }
  });
});

// 收益：
✅ 完整的积分流水记录
✅ 支持审计和对账
✅ 原子性操作（数据库事务）
✅ 可追溯每一笔变动
✅ 支持退款和回滚
```

### 已完成的工作

1. ✅ 设计数据库 schema
   - 新增 `CreditTransactionType` 枚举（6 种类型）
   - 新增 `CreditTransactionStatus` 枚举（4 种状态）
   - 新增 `CreditTransaction` 模型

2. ✅ 创建迁移脚本
   - `migration.sql` - 创建表和索引
   - `rollback.sql` - 回滚脚本

3. ✅ 更新 Prisma schema
   - 添加 `creditTransactions` 关联到 User 模型

### 数据库结构

```sql
CREATE TABLE "credit_transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "type" CreditTransactionType NOT NULL,
  "status" CreditTransactionStatus DEFAULT 'pending',
  "amount" INTEGER NOT NULL,              -- 正数=增加，负数=减少
  "balance_before" INTEGER NOT NULL,      -- 事务前余额
  "balance_after" INTEGER NOT NULL,       -- 事务后余额

  -- 关联信息
  "generation_id" TEXT,                   -- 关联生成记录
  "order_id" TEXT,                        -- 关联订单
  "invite_event_id" TEXT,                 -- 关联邀请事件

  -- 元数据
  "description" TEXT,                     -- 事务描述
  "metadata" JSONB,                       -- 额外元数据

  -- 审计信息
  "created_by" TEXT,                      -- 创建者（管理员调整）
  "created_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP
);

-- 索引
CREATE INDEX ON "credit_transactions"("user_id");
CREATE INDEX ON "credit_transactions"("type");
CREATE INDEX ON "credit_transactions"("status");
CREATE INDEX ON "credit_transactions"("generation_id");
CREATE INDEX ON "credit_transactions"("order_id");
CREATE INDEX ON "credit_transactions"("created_at");
```

### 事务类型

| 类型 | 说明 | amount | 关联字段 |
|------|------|--------|----------|
| `purchase` | 购买充值 | 正数 | orderId |
| `generation` | 生成消费 | 负数 | generationId |
| `refund` | 退款 | 正数 | generationId |
| `invite_reward` | 邀请奖励 | 正数 | inviteEventId |
| `system_grant` | 系统赠送 | 正数 | - |
| `admin_adjust` | 管理员调整 | 正/负 | createdBy |

### 下一步工作

- [ ] 更新类型定义（app/types/database.ts）
- [ ] 创建积分服务（app/lib/credit-service.ts）
- [ ] 更新 API 路由（使用新的积分服务）
- [ ] 在 Staging 环境测试
- [ ] 部署到生产环境

---

## 📊 任务优先级评估

### 为什么先做积分事务表？

**影响范围**: 大
- 涉及所有积分操作（生成、充值、退款、邀请）
- 影响数据完整性和用户信任

**复杂度**: 高
- 需要数据库事务处理
- 需要更新多个 API 路由
- 需要确保原子性

**收益**: 高
- ✅ 完整的审计能力
- ✅ 支持退款和回滚
- ✅ 数据完整性保证
- ✅ 用户信任度提升
- ✅ 合规性要求（财务审计）

**风险**: 中
- 需要仔细测试事务逻辑
- 需要确保向后兼容

---

## 🔄 其他 P1 任务预览

### 任务 #2: 统一 Domain 系统

**当前问题**:
```typescript
// 硬编码的 domain 配置
const DOMAIN_CONFIG = {
  wedding: { name: 'AI 婚纱照', ... },
  children: { name: 'AI 儿童照', ... },
  // ... 8 个 domains
};

// 问题：
❌ 无法动态管理
❌ 代码和数据库不一致
❌ 管理后台无法修改
```

**解决方案**:
- 删除硬编码配置
- 所有 domain 数据从数据库读取
- 管理后台支持 CRUD

**预计工作量**: 2-3 小时

---

### 任务 #3: 简化 Prompt 策略

**当前问题**:
```
8 个策略文件，每个 20 行
总共 160 行代码
策略内容 90% 相似
```

**解决方案**:
- 合并成 1 个 PromptBuilder 类
- Domain-specific 配置放到数据库
- 减少维护成本

**预计工作量**: 1-2 小时

---

## 📅 执行计划

### 今天（2026-02-25）
- [x] 设计积分事务表结构
- [x] 创建迁移脚本
- [x] 更新 Prisma schema
- [ ] 更新类型定义
- [ ] 创建积分服务
- [ ] 更新 API 路由

### 明天（2026-02-26）
- [ ] 在 Staging 测试积分事务
- [ ] 部署到生产环境
- [ ] 开始任务 #2（统一 Domain 系统）

### 后天（2026-02-27）
- [ ] 完成任务 #2
- [ ] 开始任务 #3（简化 Prompt 策略）
- [ ] 完成所有 P1 任务

---

## 🎯 预期成果

完成所有 P1 任务后：

1. **积分系统**
   - ✅ 完整的审计能力
   - ✅ 支持退款和回滚
   - ✅ 数据完整性保证

2. **Domain 系统**
   - ✅ 动态管理
   - ✅ 管理后台可配置
   - ✅ 代码更简洁

3. **Prompt 策略**
   - ✅ 减少 80% 代码
   - ✅ 更易维护
   - ✅ 配置化管理

**总体收益**:
- 代码质量提升
- 维护成本降低
- 功能更灵活
- 用户体验更好

---

**当前状态**: 任务 #1 进行中（60% 完成）
**下一步**: 创建积分服务和更新 API 路由
