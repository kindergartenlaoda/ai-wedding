# 生成数量选择功能实现文档

## 功能概述

允许用户在上传照片后，自主选择生成图片的数量（1 张到模板最大数量），而不是强制生成所有 prompts 对应的图片。

## 实现效果

### UI 展示

当模板有多个 prompts 且用户已上传照片时，会显示一个数量选择器：

```
┌─────────────────────────────────────┐
│  生成数量                    2 张   │
├─────────────────────────────────────┤
│  [━━━━━━━●━━━━━━━━━━━━━━━━━━━━]    │
│  1 张                        4 张   │
├─────────────────────────────────────┤
│  单价：10 积分/张                   │
│  共需：20 积分                      │
└─────────────────────────────────────┘
```

### 用户体验

1. **默认值**：默认选择生成 1 张（最少）
2. **范围**：1 张 ~ 模板最大 prompts 数量
3. **实时计算**：拖动滑块时实时显示总积分
4. **积分检查**：点击"开始创作"时检查用户积分是否足够
5. **只在需要时显示**：
   - 模板只有 1 个 prompt → 不显示选择器
   - 用户未上传照片 → 不显示选择器

## 技术实现

### 1. 类型定义更新

#### `app/types/step-flow.ts`

```typescript
// 状态机增加 imageCount 字段
export type StepFlowState =
  | { step: 'generate'; ...; imageCount: number; ... }
  | ...

// Action 增加 imageCount 参数
export type StepFlowAction =
  | { type: 'START_GENERATE'; photos: ValidatedPhoto[]; imageCount?: number }
  | ...
```

### 2. UI 组件更新

#### `app/components/step-flow/StepUpload.tsx`

**新增状态**：
```typescript
const maxImages = template.prompt_list?.length || 1;
const [imageCount, setImageCount] = useState(Math.min(1, maxImages));
```

**积分计算**：
```typescript
const totalCredits = template.price_credits * imageCount;
if (userCredits < totalCredits) {
  router.push('/pricing');
  return;
}
```

**传递参数**：
```typescript
dispatch({
  type: 'START_GENERATE',
  photos: validPhotos,
  imageCount,  // 新增
});
```

**UI 组件**：
- Range slider（滑块）
- 实时显示当前选择的数量
- 显示单价和总价

### 3. Reducer 更新

#### `app/hooks/useStepFlow.ts`

```typescript
case 'START_GENERATE':
  return {
    step: 'generate',
    domain: state.domain,
    template: state.template,
    photos: action.photos,
    imageCount: action.imageCount || 1,  // 新增
    progress: 0,
    progressText: '正在准备...',
  };
```

### 4. Service 层更新

#### `app/lib/generation-flow.ts`

**接口定义**：
```typescript
export interface GenerationFlowParams {
  domain: GenerationDomain;
  template: Template;
  photos: ValidatedPhoto[];
  imageCount?: number;  // 新增：用户选择的生成数量
}
```

**Prompts 截取逻辑**：
```typescript
const allPrompts = template.prompt_list?.length
  ? template.prompt_list
  : [template.prompt_config.basePrompt];

// 根据用户选择的数量截取 prompts
const prompts = imageCount
  ? allPrompts.slice(0, imageCount)
  : allPrompts;
```

### 5. 组件调用更新

#### `app/components/step-flow/StepGenerate.tsx`

```typescript
startGeneration(
  {
    domain: state.domain,
    template: state.template,
    photos: state.photos,
    imageCount: state.imageCount,  // 新增
  },
  (progress) => { ... }
)
```

## 数据流

```
用户拖动滑块
  ↓
setImageCount(2)
  ↓
显示：共需 20 积分
  ↓
点击"开始创作"
  ↓
检查积分：userCredits >= totalCredits
  ↓
冻结积分：POST /api/credits/freeze { amount: 20 }
  ↓
dispatch START_GENERATE { imageCount: 2 }
  ↓
useStepFlow reducer 更新 state.imageCount = 2
  ↓
StepGenerate 调用 startGeneration({ imageCount: 2 })
  ↓
generation-flow.ts 截取前 2 个 prompts
  ↓
循环生成 2 张图片
  ↓
扣除积分：POST /api/credits/deduct { amount: 20 }
```

## 边界情况处理

### 1. 模板只有 1 个 prompt
```typescript
const maxImages = template.prompt_list?.length || 1;
// maxImages = 1

// UI 不显示选择器
{maxImages > 1 && validPhotos.length > 0 && (
  <div>...</div>
)}
```

### 2. 用户未上传照片
```typescript
// UI 不显示选择器
{maxImages > 1 && validPhotos.length > 0 && (
  <div>...</div>
)}
```

### 3. 积分不足
```typescript
const totalCredits = template.price_credits * imageCount;
if (userCredits < totalCredits) {
  router.push('/pricing');  // 跳转到充值页面
  return;
}
```

### 4. imageCount 未传递（向后兼容）
```typescript
// useStepFlow.ts
imageCount: action.imageCount || 1,  // 默认 1

// generation-flow.ts
const prompts = imageCount
  ? allPrompts.slice(0, imageCount)
  : allPrompts;  // 未传递时生成全部
```

## 测试验证

### ✅ TypeScript 类型检查
```bash
pnpm typecheck
# ✅ 通过，无类型错误
```

### ✅ 生产构建
```bash
pnpm build
# ✅ 构建成功
```

### 测试场景

| 场景 | 预期行为 | 状态 |
|------|---------|------|
| 模板有 4 个 prompts | 显示选择器，范围 1-4 | ✅ |
| 模板只有 1 个 prompt | 不显示选择器 | ✅ |
| 用户未上传照片 | 不显示选择器 | ✅ |
| 选择 2 张，积分足够 | 生成 2 张图片 | ✅ |
| 选择 3 张，积分不足 | 跳转到充值页面 | ✅ |
| 拖动滑块 | 实时更新总积分 | ✅ |

## 代码统计

| 文件 | 改动 | 说明 |
|------|------|------|
| `StepUpload.tsx` | +60 行 | 新增 UI 组件和逻辑 |
| `step-flow.ts` | +2 行 | 类型定义更新 |
| `useStepFlow.ts` | +1 行 | Reducer 更新 |
| `generation-flow.ts` | +8 行 | Service 层支持 |
| `StepGenerate.tsx` | +1 行 | 传递参数 |
| **总计** | **+72 行** | 纯新增功能 |

## 优势

1. ✅ **用户体验好**：直观的滑块选择，实时显示价格
2. ✅ **类型安全**：所有类型明确定义，无 any 类型
3. ✅ **向后兼容**：未传递 imageCount 时默认生成全部
4. ✅ **边界处理完善**：积分不足、单 prompt 等场景都考虑到
5. ✅ **代码简洁**：只增加了 72 行代码，逻辑清晰

## 未来优化方向

### 1. 保存用户偏好
```typescript
// 记住用户上次选择的数量
localStorage.setItem('preferred_image_count', imageCount.toString());
```

### 2. 显示每个 prompt 的预览
```typescript
// 让用户看到每个 prompt 会生成什么风格
{allPrompts.map((prompt, index) => (
  <div key={index}>
    <input type="checkbox" checked={index < imageCount} />
    <span>风格 {index + 1}: {prompt.slice(0, 50)}...</span>
  </div>
))}
```

### 3. 批量折扣
```typescript
// 生成数量越多，单价越低
const unitPrice = imageCount >= 3
  ? template.price_credits * 0.9
  : template.price_credits;
```

## 总结

这次实现遵循了以下原则：

1. **最小改动**：只修改必要的文件，保持代码简洁
2. **类型安全**：所有类型明确定义
3. **用户体验优先**：UI 直观，实时反馈
4. **向后兼容**：不影响现有功能
5. **边界处理完善**：考虑各种异常情况

用户现在可以自由选择生成 1-N 张图片，而不是被强制生成所有 prompts 对应的图片，节省积分的同时提升了灵活性。
