# 安全修复实施指南

## 📋 实施计划

### 阶段 1：需求分析 ✅

**识别的问题**：
- 3 个 Critical 级别安全漏洞
- 4 个 Major 级别代码质量问题
- 多个 Minor 级别改进点

**优先级排序**：
1. 邀请系统身份验证漏洞（Critical）
2. Mock 支付端点暴露（Critical）
3. 事务完整性问题（Major）
4. 参数验证缺失（Major）
5. 类型系统规范化（Major）

---

## 🔧 阶段 2：代码实施

### 修复 1：邀请系统安全加固

**文件**：`app/api/invite/claim/route.ts`

**变更内容**：
```typescript
// 前：接受客户端传入的 invitee_id
const { invitee_id, ref_code } = await req.json();

// 后：从服务端 session 获取
const authResult = await requireAuth();
const invitee_id = authResult.user.id;

// 前：多个独立 DB 操作
await prisma.profiles.update(...);
await prisma.profiles.update(...);
await addCreditsForInviteReward(...);

// 后：事务包裹
await prisma.$transaction(async (tx) => {
  // 所有操作在事务中
});
```

**安全增强**：
- ✅ 防止身份伪造
- ✅ 防止竞态条件
- ✅ 幂等性保证（已领取返回 skipped）

---

### 修复 2：Mock 端点环境隔离

**文件**：
- `app/api/orders/mock/confirm/route.ts`
- `app/api/subscriptions/route.ts`

**变更内容**：
```typescript
export async function POST(req: Request) {
  // 新增环境检查
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'mock';
  if (paymentProvider !== 'mock') {
    return NextResponse.json(
      { error: 'Mock payment is not available in production.' },
      { status: 501 }
    );
  }
  // ... 原有逻辑
}
```

**部署要求**：
```bash
# 生产环境
PAYMENT_PROVIDER=stripe

# 开发/测试环境
PAYMENT_PROVIDER=mock
```

---

### 修复 3：退款事务完整性

**文件**：`app/api/credits/refund/route.ts`

**变更内容**：
```typescript
// 前：两步操作，可能部分失败
await refundCreditsForGeneration(...);
await prisma.generations.update(...);

// 后：事务包裹
await prisma.$transaction(async (tx) => {
  await refundCreditsForGeneration(...);
  if (generation_id) {
    await tx.generations.update(...);
  }
});
```

**保证**：
- ✅ 退款和状态更新原子性
- ✅ 失败时自动回滚

---

### 修复 4：参数验证标准化

**新增文件**：`app/lib/validation-utils.ts`

**工具函数**：
```typescript
// 分页参数验证
export function validatePaginationParams(
  pageRaw: string | null,
  limitRaw: string | null,
  maxLimit = 100
): { page: number; limit: number; offset: number }

// 环境检查
export function isMockPaymentMode(): boolean
export function isDevelopmentMode(): boolean

// ID 验证
export function isValidCuid(id: string): boolean
```

**应用**：`app/api/gallery/route.ts`
```typescript
const { page, limit, offset } = validatePaginationParams(
  searchParams.get('page'),
  searchParams.get('limit'),
  100 // 最大 100 条/页
);
```

---

### 修复 5：类型系统规范化

**文件**：
- `app/types/database.ts` - 统一 Profile 类型定义
- `app/contexts/AuthContext.tsx` - 导入并使用统一类型
- `app/components/ShareModal.tsx` - 更新字段引用

**变更**：
```typescript
// app/types/database.ts
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  credits: number;
  frozen_credits: number;
  role: 'user' | 'admin';
  invite_code: string | null;
  invited_by: string | null;
  invite_count: number;
  reward_credits: number;
  created_at: string;
  updated_at: string;
}

// app/contexts/AuthContext.tsx
import type { Profile } from '@/types/database';
```

**规范**：
- ✅ 类型定义集中在 `app/types/`
- ✅ 统一使用 snake_case 字段
- ✅ 移除冗余字段

---

### 修复 6：移除生产日志

**文件**：`app/components/ResultsPage.tsx`

**变更**：
```typescript
// 删除
console.log('正在加载生成结果，ID:', generationId);
console.log('生成结果数据:', { ... });
console.error('获取生成结果失败:', err);
```

---

### 修复 7：客户端邀请逻辑更新

**文件**：`app/contexts/AuthContext.tsx`

**变更**：
```typescript
// 前：传递 userId
const claimInviteReward = useCallback(async (userId: string) => {
  await fetch('/api/invite/claim', {
    body: JSON.stringify({ invitee_id: userId, ref_code: refCode }),
  });
}, []);

// 后：不传 userId，由服务端从 session 获取
const claimInviteReward = useCallback(async () => {
  await fetch('/api/invite/claim', {
    body: JSON.stringify({ ref_code: refCode }),
  });
}, []);
```

---

## 🧪 阶段 3：质量验证

### TypeScript 类型检查

```bash
pnpm typecheck
```

**结果**：✅ 通过（无类型错误）

---

### ESLint 代码规范

```bash
pnpm lint
```

**结果**：⚠️ 53 个问题
- 主要是脚本文件中的 `any` 类型
- 未使用的变量
- 不影响核心功能和安全性

**建议**：后续迭代中逐步清理

---

### 构建测试

```bash
pnpm build
```

**预期**：✅ 构建成功

---

## 📦 阶段 4：集成指南

### 环境变量配置

**生产环境** (`.env.production`):
```bash
# 必须设置为真实支付提供商
PAYMENT_PROVIDER=stripe

# Stripe 配置
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**开发环境** (`.env.local`):
```bash
# 允许使用 mock 端点
PAYMENT_PROVIDER=mock
```

---

### 数据库迁移

**无需额外迁移**，所有修复均为代码层面。

---

### 部署步骤

1. **代码审查**：
   ```bash
   git diff main...dev-0224
   ```

2. **运行测试**：
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

3. **环境变量检查**：
   - 确认生产环境 `PAYMENT_PROVIDER=stripe`
   - 确认所有必需的环境变量已设置

4. **部署**：
   ```bash
   pnpm deploy
   ```

5. **验证**：
   - 测试邀请领取流程
   - 验证 mock 端点在生产环境返回 501
   - 检查退款流程完整性

---

### 回滚计划

如果出现问题，执行回滚：

```bash
# 查看提交历史
git log --oneline -10

# 回滚到修复前
git revert <commit-hash>

# 或硬回滚（谨慎使用）
git reset --hard <commit-hash>
git push --force
```

**注意**：邀请 API 变更不向后兼容，回滚需同步更新客户端。

---

## 🧪 阶段 5：测试策略

### 单元测试（建议添加）

```typescript
// tests/api/invite-claim.test.ts
describe('POST /api/invite/claim', () => {
  it('should require authentication', async () => {
    const res = await fetch('/api/invite/claim', {
      method: 'POST',
      body: JSON.stringify({ ref_code: 'TEST123' }),
    });
    expect(res.status).toBe(401);
  });

  it('should prevent duplicate claims', async () => {
    // 第一次领取
    const res1 = await authenticatedFetch('/api/invite/claim', {
      method: 'POST',
      body: JSON.stringify({ ref_code: 'TEST123' }),
    });
    expect(res1.status).toBe(200);

    // 第二次领取（幂等性）
    const res2 = await authenticatedFetch('/api/invite/claim', {
      method: 'POST',
      body: JSON.stringify({ ref_code: 'TEST123' }),
    });
    const data = await res2.json();
    expect(data.skipped).toBe(true);
  });
});
```

---

### 集成测试

```typescript
// tests/integration/payment-mock.test.ts
describe('Mock Payment Protection', () => {
  it('should block mock payment in production', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe';

    const res = await fetch('/api/orders/mock/confirm', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: 'pi_test' }),
    });

    expect(res.status).toBe(501);
    const data = await res.json();
    expect(data.error).toContain('not available in production');
  });
});
```

---

### 手动测试清单

#### 邀请系统
- [ ] 用户 A 生成邀请链接
- [ ] 用户 B 通过链接注册
- [ ] 验证双方积分到账
- [ ] 尝试重复领取（应返回 skipped）
- [ ] 尝试伪造 invitee_id（应失败）

#### Mock 支付
- [ ] 开发环境：mock 端点可用
- [ ] 生产环境：mock 端点返回 501
- [ ] 真实支付流程正常

#### 退款流程
- [ ] 生成失败触发退款
- [ ] 验证积分退回
- [ ] 验证 generation 状态更新为 failed

#### 画廊 API
- [ ] 正常分页请求
- [ ] 超大 limit 请求（应限制为 100）
- [ ] 无效 page/limit（应使用默认值）

---

## 📈 阶段 6：后续行动

### 短期（1-2 周）

1. **添加自动化测试**
   - 单元测试覆盖核心 API
   - 集成测试覆盖关键流程

2. **监控告警**
   - 添加 API 错误率监控
   - 设置异常请求告警

3. **文档更新**
   - 更新 API 文档
   - 更新部署文档

---

### 中期（1-2 月）

1. **安全加固**
   - 实施 API 速率限制
   - 添加请求签名验证
   - 实施 CSRF 保护

2. **代码质量**
   - 清理 ESLint 警告
   - 移除所有 `any` 类型
   - 统一错误处理

3. **性能优化**
   - 添加 Redis 缓存
   - 优化数据库查询
   - 实施 CDN 加速

---

### 长期（3-6 月）

1. **安全审计**
   - 定期渗透测试
   - 第三方安全审计
   - 漏洞赏金计划

2. **架构升级**
   - 微服务拆分
   - 消息队列引入
   - 分布式事务

3. **合规认证**
   - GDPR 合规
   - SOC 2 认证
   - ISO 27001 认证

---

## 📞 支持与反馈

### 问题报告

如发现问题，请提供以下信息：
- 环境（开发/生产）
- 复现步骤
- 错误日志
- 预期行为

### 联系方式

- GitHub Issues: [项目仓库]/issues
- 邮件: dev-team@example.com
- Slack: #security-fixes

---

## 📚 参考资料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Prisma Transaction Guide](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

---

**文档版本**：1.0
**最后更新**：2026-02-27
**维护者**：开发团队
