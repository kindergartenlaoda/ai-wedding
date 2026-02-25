# StepGenerate 组件重构总结

## 重构目标

将 StepGenerate 组件中的业务逻辑抽离到独立的 service 层，实现关注点分离。

## 重构前后对比

### 代码行数变化

| 文件 | 重构前 | 重构后 | 变化 |
|------|--------|--------|------|
| `StepGenerate.tsx` | 422 行 | 240 行 | **-182 行 (-43%)** |
| `generation-flow.ts` | 0 行 | 436 行 | **+436 行 (新增)** |

### 职责分离

**重构前**：
- ❌ StepGenerate 组件包含 200+ 行业务逻辑
- ❌ UI 渲染、状态管理、API 调用混在一起
- ❌ 难以测试、难以复用

**重构后**：
- ✅ StepGenerate 组件只负责 UI 和用户交互（240 行）
- ✅ generation-flow.ts 封装完整的生成流程（436 行）
- ✅ 清晰的接口定义和类型安全

## 新增 Service 层：`generation-flow.ts`

### 核心功能

```typescript
export async function startGeneration(
  params: GenerationFlowParams,
  onProgress?: ProgressCallback
): Promise<GenerationFlowResult>
```

**封装的步骤**：
1. 冻结积分（`freezeCredits`）
2. 创建项目（`createProject`）
3. 创建生成记录（`createGeneration`）
4. 循环生成图片（`generateSingleImage`）
5. 上传图片到 MinIO（`uploadImage`）
6. 更新生成状态（`updateGenerationStatus`）
7. 扣除积分（`deductCredits`）
8. 失败回滚（`unfreezeCredits`）

### 类型定义

```typescript
// 输入参数
interface GenerationFlowParams {
  domain: GenerationDomain;
  template: Template;
  photos: ValidatedPhoto[];
}

// 返回结果
interface GenerationFlowResult {
  images: string[];
  generationId: string;
}

// 进度回调
interface GenerationFlowProgress {
  stage: 'freezing' | 'creating_project' | 'creating_generation' |
         'generating' | 'uploading' | 'finalizing';
  progress: number;
  message: string;
}

// 自定义错误
class GenerationFlowError extends Error {
  stage: GenerationFlowProgress['stage'];
  cause?: unknown;
}
```

### 优势

1. **单一职责**：每个函数只做一件事
2. **类型安全**：所有类型都明确定义，无 `any` 类型
3. **可测试性**：每个步骤都可以独立测试
4. **可复用性**：其他组件也可以调用 `startGeneration()`
5. **错误处理**：统一的错误处理和回滚机制
6. **进度追踪**：通过回调函数实时报告进度

## 重构后的 StepGenerate 组件

### 简化的生成逻辑

**重构前**（200+ 行）：
```typescript
useEffect(() => {
  const runGeneration = async () => {
    try {
      // 冻结积分
      const freezeRes = await fetch('/api/credits/freeze', ...);
      // 创建项目
      const res = await fetch('/api/projects', ...);
      // 创建生成记录
      const genRes = await fetch('/api/generations', ...);
      // 循环生成图片
      for (const prompt of prompts) {
        const streamRes = await fetch('/api/generate-stream', ...);
        // 解析 SSE 流
        const reader = streamRes.body.getReader();
        // ... 100+ 行流式解析逻辑
      }
      // 上传图片
      // 更新状态
      // 扣除积分
    } catch (err) {
      // 回滚积分
    }
  };
  runGeneration();
}, [state, dispatch, refreshProfile]);
```

**重构后**（30 行）：
```typescript
useEffect(() => {
  if (state.step !== 'generate' || hasStartedRef.current) return;
  hasStartedRef.current = true;

  startGeneration(
    {
      domain: state.domain,
      template: state.template,
      photos: state.photos,
    },
    (progress) => {
      dispatch({
        type: 'UPDATE_PROGRESS',
        progress: progress.progress,
        progressText: progress.message,
      });
    }
  )
    .then(async (result) => {
      await refreshProfile();
      dispatch({
        type: 'COMPLETE',
        images: result.images,
        generationId: result.generationId,
      });
    })
    .catch(async (err) => {
      await refreshProfile();
      dispatch({
        type: 'FAIL',
        error: err instanceof Error ? err.message : '生成失败',
      });
    });
}, [state, dispatch, refreshProfile]);
```

### 组件职责

现在 StepGenerate 只负责：
1. ✅ 渲染 UI（进度条、提示、结果展示）
2. ✅ 管理本地状态（tipIndex, showResults）
3. ✅ GSAP 动画效果
4. ✅ 调用 service 层并处理结果

## 代码质量提升

### TypeScript 严格模式

- ✅ 所有类型明确定义
- ✅ 无 `any` 类型
- ✅ 通过 `pnpm typecheck` 检查

### 可维护性

- ✅ 单个函数不超过 50 行
- ✅ 清晰的函数命名
- ✅ 详细的 JSDoc 注释

### 可测试性

现在可以轻松测试：
```typescript
// 测试单个步骤
test('freezeCredits should throw when insufficient', async () => {
  // mock fetch
  await expect(freezeCredits(100)).rejects.toThrow('积分不足');
});

// 测试完整流程
test('startGeneration should complete successfully', async () => {
  const result = await startGeneration(params, onProgress);
  expect(result.images).toHaveLength(4);
  expect(result.generationId).toBeDefined();
});
```

## 未来改进方向

### 1. 进一步简化 API 调用

当前仍需调用 9 个 API，建议合并为 2-3 个：
```typescript
// 理想状态：
POST /api/generations/start  // 创建项目+生成记录+扣积分（一个事务）
POST /api/generate-stream     // 流式生成（可多次调用）
```

### 2. 添加单元测试

为 `generation-flow.ts` 添加完整的单元测试覆盖：
- 每个步骤的成功/失败场景
- 错误回滚机制
- 进度回调

### 3. 优化积分系统

移除 `frozenCredits` 字段，使用数据库锁：
```sql
UPDATE profiles
SET credits = credits - ?
WHERE user_id = ? AND credits >= ?
RETURNING credits;
```

### 4. 添加重试机制

对于网络错误，添加自动重试：
```typescript
async function generateSingleImage(prompt, photoUrls, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await doGenerate(prompt, photoUrls);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

## 总结

这次重构遵循了 Linus Torvalds 的"好品味"原则：

1. ✅ **数据结构优先**：清晰的类型定义
2. ✅ **消除特殊情况**：统一的错误处理
3. ✅ **简洁执念**：每个函数只做一件事
4. ✅ **实用主义**：解决实际问题（可测试性、可维护性）

**核心改进**：
- 代码行数减少 43%
- 职责分离清晰
- 类型安全
- 可测试、可复用

**下一步**：
- 添加单元测试
- 优化 API 设计
- 简化积分系统
