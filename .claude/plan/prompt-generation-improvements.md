# 提示词生成功能全面改进计划

> 生成时间: 2026-03-04
> 任务类型: 全栈改进（后端安全 + 前端体验 + 数据层 + 性能）
> 优先级: P0（安全 + 积分）→ P1（数据 + 性能）→ P2（体验 + 分析）

## 改进背景

当前项目已实现提示词生成功能（`/generate-prompts`），但与 `generate-single` 的最佳实践相比，缺少以下关键能力：
- ❌ 速率限制（防滥用）
- ❌ Zod 输入验证（安全）
- ❌ 积分系统（业务模型）
- ❌ 历史记录（数据分析）
- ❌ 性能优化（缓存）

本计划将全面改进上述问题。

---

## Phase 1：安全层改进（P0 - 最高优先级）

### 1.1 添加速率限制

**文件**: `app/api/generate-prompts/route.ts`

**实现**:
```typescript
import { checkRateLimit, rateLimitResponse } from '@/lib/generation-shared';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  // 速率限制：5 次/小时/用户
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    log.warn({ userId: user.id, count: rl.count }, '速率限制超过');
    return rateLimitResponse(rl.retryAfter!);
  }

  // ...继续原有逻辑
}
```

**测试**:
- 同一用户 1 小时内调用 6 次，第 6 次应返回 429

---

### 1.2 添加 Zod 输入验证

**文件**: `app/lib/validations.ts`

**新增 Schema**:
```typescript
import { z } from 'zod';
import { isValidDomain } from '@/types/domain';

// 图片 Base64 验证函数
function validateImageBase64(base64: string): boolean {
  try {
    // 1. 格式检查
    if (!base64.startsWith('data:image/')) return false;

    // 2. 提取 base64 数据
    const parts = base64.split(',');
    if (parts.length !== 2) return false;

    const buffer = Buffer.from(parts[1], 'base64');

    // 3. Magic Number 检测
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

    if (!isJPEG && !isPNG) return false;

    // 4. 大小限制 10MB
    return buffer.length <= 10 * 1024 * 1024;
  } catch {
    return false;
  }
}

export const GeneratePromptsSchema = z.object({
  imageBase64: z.string()
    .min(100, '图片数据无效')
    .refine(validateImageBase64, {
      message: '无效的图片格式（仅支持 JPEG/PNG，最大 10MB）',
    }),
  domain: z.string()
    .refine(isValidDomain, '无效的领域')
    .default('wedding'),
});

export type GeneratePromptsInput = z.infer<typeof GeneratePromptsSchema>;
```

**集成到 API**:
```typescript
import { GeneratePromptsSchema, validateData } from '@/lib/validations';

export async function POST(req: NextRequest) {
  // ...认证 + 速率限制

  const body = await req.json();
  const validation = validateData(GeneratePromptsSchema, body);
  if (!validation.success) {
    log.error({ error: validation.error }, '参数验证失败');
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { imageBase64, domain } = validation.data;

  // ...继续业务逻辑
}
```

**测试**:
- 上传非图片 data URL → 400 错误
- 上传 > 10MB 图片 → 400 错误
- 上传正常图片 → 成功

---

### 1.3 超时控制

**文件**: `app/api/generate-prompts/route.ts` 中的 `generatePromptsWithStrategy`

**实现**:
```typescript
async function generatePromptsWithStrategy(...) {
  const endpoint = `${api_base_url.replace(/\/$/, '')}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify(requestData),
    signal: AbortSignal.timeout(30000), // 30 秒超时
  });

  // ...
}
```

**测试**:
- 模拟 AI API 超过 30 秒未响应 → 抛出 AbortError

---

## Phase 2：积分系统集成（P0）

### 2.1 定义积分消耗

**文件**: `app/api/generate-prompts/route.ts`

```typescript
const CREDITS_PER_PROMPT_GENERATION = 5; // 可根据业务调整
```

---

### 2.2 集成积分服务

**文件**: `app/api/generate-prompts/route.ts`

**导入**:
```typescript
import {
  deductCreditsForGeneration,
  refundCreditsForGeneration,
  getUserCreditBalance,
} from '@/lib/credit-service';
```

**完整流程**:
```typescript
export async function POST(req: NextRequest) {
  const requestId = `prompts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const log = createRequestLogger('generate-prompts', requestId);

  let userId: string | null = null;

  try {
    // 1. 认证
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    userId = authResult.user.id;

    // 2. 速率限制
    const rl = checkRateLimit(userId);
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfter!);
    }

    // 3. 检查积分
    const balance = await getUserCreditBalance(userId);
    log.info({ credits: balance }, '用户积分余额');

    if (balance < CREDITS_PER_PROMPT_GENERATION) {
      return NextResponse.json({
        error: '积分不足',
        current_credits: balance,
        required_credits: CREDITS_PER_PROMPT_GENERATION,
      }, { status: 402 });
    }

    // 4. 先扣积分
    const tempId = `prompt_${requestId}`;
    await deductCreditsForGeneration(
      userId,
      tempId,
      CREDITS_PER_PROMPT_GENERATION,
      '提示词生成消费积分'
    );
    log.info({ deducted: CREDITS_PER_PROMPT_GENERATION }, '成功扣除积分');

    // 5. 输入验证
    const body = await req.json();
    const validation = validateData(GeneratePromptsSchema, body);
    if (!validation.success) {
      await refundCreditsForGeneration(userId, tempId, CREDITS_PER_PROMPT_GENERATION, '验证失败退款');
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { imageBase64, domain } = validation.data;

    // 6. 获取配置 + 生成提示词
    const dbConfig = await getActivePromptsConfig(log);
    if (!dbConfig) {
      await refundCreditsForGeneration(userId, tempId, CREDITS_PER_PROMPT_GENERATION, '配置不可用退款');
      return NextResponse.json({ error: '暂无可用配置' }, { status: 500 });
    }

    const strategy = getPromptStrategy(domain);
    const analysisPrompt = strategy.generateAnalysisPrompt();

    const prompts = await generatePromptsWithStrategy(
      imageBase64,
      dbConfig.api_base_url,
      dbConfig.api_key,
      dbConfig.model_name,
      analysisPrompt,
      log
    );

    // 7. 成功，保留扣除
    log.info({ count: prompts.length }, '成功生成提示词');

    return NextResponse.json({
      success: true,
      prompts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    log.error({ error: err }, '发生异常');

    // 8. 失败退款
    if (userId) {
      await refundCreditsForGeneration(
        userId,
        `prompt_${requestId}`,
        CREDITS_PER_PROMPT_GENERATION,
        '生成失败退款'
      );
      log.info('已退还积分');
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**测试**:
- 积分不足 → 402 错误，不扣积分
- 生成成功 → 扣除 5 积分
- 生成失败 → 退还 5 积分

---

## Phase 3：数据持久化（P1）

### 3.1 数据库迁移 - 新增 `prompt_generations` 表

**文件**: `prisma/schema.prisma`

**新增 Model**:
```prisma
model prompt_generations {
  id              String   @id @default(cuid())
  user_id         String
  domain          String   @default("wedding")
  input_image_url String?  // 可选：存储 MinIO URL
  prompts         Json     // [{ index, chinese, english }]
  model_config_id String?
  credits_used    Int      @default(5)
  created_at      DateTime @default(now())

  users           users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([domain])
  @@index([created_at])
}
```

**更新 `users` model**:
```prisma
model users {
  // ...existing fields
  prompt_generations prompt_generations[]
}
```

**迁移命令**:
```bash
pnpm prisma migrate dev --name add_prompt_generations
pnpm prisma generate
```

---

### 3.2 保存生成记录

**文件**: `app/api/generate-prompts/route.ts`

**实现**:
```typescript
// 在 prompts 生成成功后
const record = await prisma.prompt_generations.create({
  data: {
    user_id: userId,
    domain,
    prompts: prompts,
    model_config_id: dbConfig.id,
    credits_used: CREDITS_PER_PROMPT_GENERATION,
  },
});

log.info({ recordId: record.id }, '保存历史记录成功');

return NextResponse.json({
  success: true,
  prompts,
  recordId: record.id, // 可选：返回给前端
});
```

---

### 3.3 历史记录查询 API

**文件**: `app/api/prompt-generations/route.ts`（新建）

**实现**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-api';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.prompt_generations.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.prompt_generations.count({
      where: { user_id: user.id },
    }),
  ]);

  return NextResponse.json({
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
```

**测试**:
- GET `/api/prompt-generations?page=1&limit=10` → 返回历史记录

---

### 3.4 前端历史记录 Hook

**文件**: `app/hooks/usePromptHistory.ts`（新建）

**实现**:
```typescript
import { useState, useEffect } from 'react';
import type { PromptItem } from '@/types/prompt';

interface PromptGenerationRecord {
  id: string;
  domain: string;
  prompts: PromptItem[];
  credits_used: number;
  created_at: string;
}

interface UsePromptHistoryReturn {
  records: PromptGenerationRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePromptHistory(): UsePromptHistoryReturn {
  const [records, setRecords] = useState<PromptGenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prompt-generations', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();
      setRecords(data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return {
    records,
    loading,
    error,
    refresh: fetchRecords,
  };
}
```

---

### 3.5 前端历史标签页

**文件**: `app/components/GeneratePromptsPage.tsx`

**实现**:
```typescript
import { usePromptHistory } from '@/hooks/usePromptHistory';

export function GeneratePromptsPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const { records, loading: historyLoading } = usePromptHistory();

  return (
    <div>
      {/* 标签切换 */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('generate')}
          className={activeTab === 'generate' ? 'active' : ''}
        >
          生成提示词
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={activeTab === 'history' ? 'active' : ''}
        >
          历史记录
        </button>
      </div>

      {/* 内容区 */}
      {activeTab === 'generate' ? (
        <div>{/* 原有生成 UI */}</div>
      ) : (
        <div>
          {historyLoading ? (
            <p>加载中...</p>
          ) : (
            <ul>
              {records.map((record) => (
                <li key={record.id}>
                  {/* 展示历史记录 */}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4：性能优化（P1）

### 4.1 Redis 缓存 model_configs

**文件**: `app/lib/redis.ts`（如果不存在则新建）

**Redis 客户端**:
```typescript
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**环境变量** (`.env`):
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**缓存逻辑**:

**文件**: `app/api/generate-prompts/route.ts`

```typescript
import { redis } from '@/lib/redis';

async function getActivePromptsConfig(log): Promise<ModelConfig | null> {
  const cacheKey = 'model_config:generate_prompts:active';

  try {
    // 1. 尝试从缓存读取
    const cached = await redis.get(cacheKey);
    if (cached) {
      log.info('使用缓存配置');
      return JSON.parse(cached as string);
    }
  } catch (err) {
    log.warn({ error: err }, 'Redis 读取失败，降级到数据库');
  }

  // 2. 缓存未命中，查询数据库
  try {
    const config = await prisma.model_configs.findFirst({
      where: { type: ModelConfigType.generate_prompts, status: 'active' },
    });

    if (!config) return null;

    const modelConfig: ModelConfig = {
      id: config.id,
      type: config.type as ModelConfig['type'],
      name: config.name,
      api_base_url: config.api_base_url,
      api_key: config.api_key,
      model_name: config.model_name,
      status: config.status as ModelConfig['status'],
      source: config.source as ModelConfig['source'],
      description: config.description ?? undefined,
      created_at: config.created_at.toISOString(),
      updated_at: config.updated_at.toISOString(),
      created_by: config.created_by ?? undefined,
    };

    // 3. 写入缓存（TTL 5 分钟）
    try {
      await redis.set(cacheKey, JSON.stringify(modelConfig), { ex: 300 });
      log.info('配置已缓存');
    } catch (err) {
      log.warn({ error: err }, 'Redis 写入失败');
    }

    return modelConfig;
  } catch (err) {
    log.error({ error: err }, '获取激活提示词生成配置异常');
    return null;
  }
}
```

**缓存失效**:

**文件**: `app/api/admin/model-configs/[id]/route.ts`（更新配置时清除缓存）

```typescript
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // ...更新配置

  // 清除缓存
  try {
    await redis.del('model_config:generate_prompts:active');
  } catch {
    // 忽略错误
  }

  return NextResponse.json(updatedConfig);
}
```

**测试**:
- 第一次请求 → 查询数据库 + 写入缓存
- 第二次请求 → 从缓存读取（响应时间减少 ~50ms）
- Admin 更新配置 → 缓存失效

---

## Phase 5：用户体验优化（P2）

### 5.1 前端图片压缩

**安装依赖**:
```bash
pnpm add browser-image-compression
```

**文件**: `app/components/GeneratePromptsPage.tsx`

**实现**:
```typescript
import imageCompression from 'browser-image-compression';

const handleFileSelect = async (file: File): Promise<void> {
  if (!user) {
    setShowAuthModal(true);
    return;
  }

  setError(null);
  setSuccess(null);

  if (!file.type.startsWith('image/')) {
    setError('请上传图片文件');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setError('图片大小不能超过 10MB');
    return;
  }

  try {
    // 压缩图片
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    // 转换为 base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      clearPrompts();
    };
    reader.readAsDataURL(compressedFile);
  } catch {
    setError('图片处理失败，请重试');
  }
};
```

**测试**:
- 上传 5MB 图片 → 压缩到 < 1MB
- 上传 1920x1080 图片 → 保持原尺寸
- 上传 4K 图片 → 缩小到 1920px

---

### 5.2 生成进度条

**文件**: `app/hooks/usePromptGeneration.ts`

**新增状态**:
```typescript
interface UsePromptGenerationReturn {
  isGenerating: boolean;
  progress: number; // 0-100
  prompts: PromptItem[];
  generatePrompts: (imageBase64: string) => Promise<void>;
  error: string | null;
  clearPrompts: () => void;
}

export function usePromptGeneration(): UsePromptGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePrompts = async (imageBase64: string): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    setPrompts([]);
    setProgress(0);

    try {
      setProgress(20); // 准备请求

      const response = await fetch('/api/generate-prompts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      setProgress(40); // 已发送请求

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }

      setProgress(70); // 正在解析响应

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      setProgress(90);
      setPrompts(result.prompts);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearPrompts = (): void => {
    setPrompts([]);
    setError(null);
    setProgress(0);
  };

  return {
    isGenerating,
    progress,
    prompts,
    generatePrompts,
    error,
    clearPrompts,
  };
}
```

**前端 UI**:

**文件**: `app/components/GeneratePromptsPage.tsx`

```typescript
import { ProgressBar } from '@/components/ui/progress-bar';

const { isGenerating, progress, prompts, generatePrompts } = usePromptGeneration();

// 在 UI 中添加进度条
{isGenerating && (
  <div className="mt-4">
    <ProgressBar value={progress} />
    <p className="text-sm text-center mt-2">{progress}%</p>
  </div>
)}
```

---

### 5.3 失败重试机制

**文件**: `app/components/GeneratePromptsPage.tsx`

**实现**:
```typescript
const [lastImageBase64, setLastImageBase64] = useState<string | null>(null);

const handleGenerate = async (): Promise<void> => {
  if (!user || !uploadedImage) return;

  setError(null);
  setSuccess(null);
  setLastImageBase64(uploadedImage); // 保存图片用于重试

  try {
    await generatePrompts(uploadedImage);
    setSuccess('成功生成 5 个风格方案！');
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失败，请重试';
    setError(message);
  }
};

const handleRetry = async (): Promise<void> => {
  if (!lastImageBase64) return;

  setError(null);
  setSuccess(null);

  try {
    await generatePrompts(lastImageBase64);
    setSuccess('成功生成 5 个风格方案！');
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失败，请重试';
    setError(message);
  }
};

// UI
{error && (
  <div className="flex gap-3 items-start p-4 mt-6 bg-red-50 rounded-lg border border-red-200">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <div className="flex-1">
      <p className="text-red-700">{error}</p>
      <button
        onClick={handleRetry}
        className="mt-2 text-sm text-red-600 underline"
      >
        重试
      </button>
    </div>
  </div>
)}
```

---

### 5.4 加载骨架屏

**文件**: `app/components/GeneratePromptsPage.tsx`

**实现**:
```typescript
import { CardSkeleton } from '@/components/ui/card-skeleton';

{isGenerating && (
  <div className="space-y-4">
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
)}
```

---

## Phase 6：数据分析与监控（P2）

### 6.1 统计 API

**文件**: `app/api/prompt-generations/stats/route.ts`（新建）

**实现**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (adminResult instanceof Response) return adminResult;

  const [totalCount, domainStats] = await Promise.all([
    prisma.prompt_generations.count(),
    prisma.prompt_generations.groupBy({
      by: ['domain'],
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    totalCount,
    byDomain: domainStats.map(s => ({
      domain: s.domain,
      count: s._count.id,
    })),
  });
}
```

---

### 6.2 Admin 仪表盘

**文件**: `app/admin/prompt-generations/page.tsx`（新建）

**实现**:
```typescript
"use client";

import { useState, useEffect } from 'react';

export default function PromptGenerationsAdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/prompt-generations/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <p>加载中...</p>;

  return (
    <div>
      <h1>提示词生成统计</h1>
      <p>总生成次数: {stats.totalCount}</p>
      <ul>
        {stats.byDomain.map((item: any) => (
          <li key={item.domain}>
            {item.domain}: {item.count} 次
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/api/generate-prompts/route.ts` | 修改 | 添加速率限制、验证、积分、超时、保存记录 |
| `app/lib/validations.ts` | 修改 | 新增 `GeneratePromptsSchema` + `validateImageBase64` |
| `app/lib/generation-shared.ts` | 引用 | 复用 `checkRateLimit`, `rateLimitResponse` |
| `app/lib/credit-service.ts` | 引用 | 复用积分扣除/退款逻辑 |
| `prisma/schema.prisma` | 修改 | 新增 `prompt_generations` model |
| `app/api/prompt-generations/route.ts` | 新建 | 历史记录查询 API |
| `app/hooks/usePromptHistory.ts` | 新建 | 历史记录前端 Hook |
| `app/components/GeneratePromptsPage.tsx` | 修改 | 添加压缩、进度条、重试、历史标签 |
| `app/lib/redis.ts` | 引用/新建 | Redis 缓存工具 |
| `app/api/prompt-generations/stats/route.ts` | 新建 | 统计 API（Phase 6） |
| `app/admin/prompt-generations/page.tsx` | 新建 | Admin 仪表盘（Phase 6） |

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| **Redis 不可用** | 降级到直接查询数据库 |
| **积分扣除后生成失败** | try-catch 包裹，失败时退款 |
| **数据库迁移失败** | 先在开发环境测试，使用 Prisma preview feature |
| **速率限制过严** | 可配置化（环境变量 `PROMPT_GEN_RATE_LIMIT`） |
| **图片压缩损失质量** | 设置最低质量阈值 `quality: 0.9` |

---

## 依赖项

**新增 npm 包**:
```json
{
  "browser-image-compression": "^2.0.2"
}
```

**已有依赖**（可复用）:
- `@upstash/redis` - Redis 缓存（如果已安装）
- `zod` - 输入验证
- `@prisma/client` - 数据库

---

## 测试策略

**1. 单元测试** (手动 + 可选自动化):
- `validateImageBase64` 函数
- 速率限制逻辑
- 积分扣除/退款逻辑

**2. 集成测试**:
- API Route 端到端测试（认证 → 扣积分 → 生成 → 保存）
- 失败回滚测试（生成失败 → 积分退款）

**3. 性能测试**:
- Redis 缓存命中率
- API 响应时间（目标 < 20 秒）

---

## 数据库迁移命令

```bash
# 1. 修改 schema.prisma 后生成迁移
pnpm prisma migrate dev --name add_prompt_generations

# 2. 应用迁移
pnpm prisma migrate deploy

# 3. 验证迁移
pnpm verify-db
```

---

## 实施顺序建议

**Week 1**（P0 - 安全 + 积分）:
1. Day 1-2: Phase 1（安全层）
2. Day 3-4: Phase 2（积分系统）
3. Day 5: 测试 + 修复

**Week 2**（P1 - 数据 + 性能）:
1. Day 1-2: Phase 3（数据持久化）
2. Day 3: Phase 4（性能优化）
3. Day 4-5: 测试 + 优化

**Week 3**（P2 - 体验 + 分析）:
1. Day 1-2: Phase 5（用户体验）
2. Day 3-4: Phase 6（数据分析）
3. Day 5: 全面测试 + 上线

---

## SESSION_ID（供 `/ccg:execute` 使用）

由于这是改进现有功能（非新功能开发），不需要外部模型协作。可以直接执行：

```bash
/ccg:execute .claude/plan/prompt-generation-improvements.md
```
