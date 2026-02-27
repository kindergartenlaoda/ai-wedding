# 提示词后端化改造方案

> 创建日期: 2026-02-27
> 状态: 设计中

## 一、问题概述

当前系统中，模板的提示词（`prompt_config`、`prompt_list`）从数据库 → API → 前端 → 再传回 API 的完整链路中，**提示词全程暴露给客户端**：

1. `/api/templates` 公开 API 直接返回 `prompt_config` 和 `prompt_list`
2. 前端 `TemplateSelector` 组件直接在 UI 上展示完整英文提示词
3. 前端 `useStreamImageGeneration` hook 在客户端 JS 中组装增强提示词模板
4. 前端 `generation-flow.ts` / `generation-service.ts` 从模板对象中读取提示词后传给 API

**核心目标**：提示词永远不离开服务端，前端只负责选择和展示，不接触原始 prompt 内容。

---

## 二、当前数据流（改造前）

```
┌─────────────────────────────────────────────────────────────────────┐
│  DB (templates)                                                      │
│  ├── prompt_config: { basePrompt: "...", styleModifiers: [...] }     │
│  └── prompt_list: ["prompt1", "prompt2", ...]                        │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GET /api/templates                                                  │
│  返回完整 prompt_config + prompt_list（❌ 暴露）                       │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  前端 Hooks & Components                                             │
│  ├── useTemplates() → 拿到含 prompt 的 templates                      │
│  ├── useTemplateSelection() → getCurrentPrompt() 读取 prompt 文本     │
│  ├── TemplateSelector.tsx → 直接展示 prompt 全文（❌ 暴露）             │
│  ├── useStreamImageGeneration → 前端组装增强 prompt（❌ 暴露）          │
│  ├── generation-flow.ts → 读取 template.prompt_list（❌ 暴露）         │
│  └── generation-service.ts → getPromptsFromTemplate()（❌ 暴露）       │
└──────────────┬──────────────────────────────────────────────────────┘
               │ POST { prompt: "完整提示词文本", image_inputs: [...] }
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/generate-stream | generate-single | generate-image        │
│  接收前端传来的 prompt → composePrompt() → 调用 AI API                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、目标数据流（改造后）

```
┌─────────────────────────────────────────────────────────────────────┐
│  DB (templates)                                                      │
│  ├── prompt_config: { basePrompt: "..." }  ← 仅服务端可见             │
│  ├── prompt_list: ["prompt1", "prompt2"]   ← 仅服务端可见             │
│  └── prompt_descriptions: ["浪漫海滩", "复古花园"]  ← 新增，前端展示用  │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GET /api/templates                                                  │
│  返回: id, name, description, preview_image_url, price_credits,      │
│        domain, prompt_count, prompt_descriptions                     │
│  不返回: prompt_config, prompt_list（✅ 不暴露）                       │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  前端 Hooks & Components                                             │
│  ├── useTemplates() → 拿到不含 prompt 的 templates                    │
│  ├── useTemplateSelection() → 维护 templateId + promptIndex           │
│  ├── TemplateSelector.tsx → 展示 prompt_descriptions（✅ 不暴露）      │
│  ├── useStreamImageGeneration → 传 templateId + promptIndex           │
│  ├── generation-flow.ts → 传 templateId + imageCount                  │
│  └── generation-service.ts → 传 templateId                            │
└──────────────┬──────────────────────────────────────────────────────┘
               │ 模板模式: POST { template_id, prompt_index, image_inputs, settings }
               │ 自定义模式: POST { custom_prompt, image_inputs, settings }
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST /api/generate-stream | generate-single                         │
│  ├── 模板模式: 根据 template_id 从 DB 查 prompt → composePrompt()     │
│  ├── 自定义模式: 使用 custom_prompt → composePrompt()                 │
│  ├── 增强逻辑（face preservation 等）全部在服务端完成                    │
│  └── 调用 AI API（✅ prompt 不离开服务端）                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、改动文件清单

### 4.1 数据库层

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `prisma/schema.prisma` | templates 表新增 `prompt_descriptions Json @default("[]")` 字段 | P0 |
| 新建 migration | `pnpm prisma migrate dev --name add_prompt_descriptions` | P0 |

**`prompt_descriptions` 字段说明**：
- 类型：`Json`（字符串数组），与 `prompt_list` 一一对应
- 用途：前端展示用的中文摘要，如 `["浪漫海滩夕阳风格", "复古花园油画风格"]`
- 如果为空，前端显示"光影方案 1"、"光影方案 2"等默认文案

### 4.2 API 层

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `app/api/templates/route.ts` | 移除 `prompt_config`、`prompt_list`，新增 `prompt_count`、`prompt_descriptions` | P0 |
| `app/api/generate-stream/route.ts` | 支持 `template_id` + `prompt_index` 模式，服务端查 prompt | P0 |
| `app/api/generate-single/route.ts` | 同上，并将 face preservation 增强逻辑移入 | P0 |
| `app/api/generate-image/route.ts` | 同上（如仍在使用） | P1 |
| `app/lib/validations.ts` | 新增 `GenerateFromTemplateSchema`，调整 `GenerateImageSchema` | P0 |
| `app/lib/generation-shared.ts` | 新增 `resolvePromptFromTemplate()` 函数 | P0 |
| `app/api/admin/templates/route.ts` | 保持不变，管理端仍可读写完整 prompt | - |
| `app/api/admin/templates/[id]/route.ts` | 保持不变 | - |

### 4.3 前端类型

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `app/types/database.ts` | `Template` 接口移除 `prompt_config`、`prompt_list`，新增 `prompt_count`、`prompt_descriptions` | P0 |

### 4.4 前端 Hooks

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `app/hooks/useTemplateSelection.ts` | `getCurrentPrompt()` 改为 `getGenerateParams()`，返回 `{ templateId, promptIndex }` 或 `{ customPrompt }` | P0 |
| `app/hooks/useStreamImageGeneration.ts` | 请求体改为传 `template_id` + `prompt_index`（或 `custom_prompt`），移除前端 prompt 增强逻辑 | P0 |
| `app/hooks/useTemplates.ts` | 无需改动（API 返回字段变了，但 hook 逻辑不变） | - |

### 4.5 前端组件

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `app/components/GenerateSinglePage/TemplateSelector.tsx` | 不再展示 prompt 全文，改为展示 `prompt_descriptions` 或默认文案 | P0 |
| `app/components/GenerateSinglePage/GenerationSettings.tsx` | 自定义提示词区域保留，但选中模板时不再显示 prompt 内容 | P0 |
| `app/components/GenerateSinglePage.tsx` | `handleGenerate()` 改为传 `templateId` + `promptIndex` | P0 |
| `app/components/GenerateSinglePage/types.ts` | 可能需要调整类型 | P1 |

### 4.6 批量生成流程

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `app/lib/generation-flow.ts` | 不再从 template 读 prompt，改为传 `template_id` + `imageCount`，由 API 端处理 | P0 |
| `app/lib/generation-service.ts` | 移除 `getPromptsFromTemplate()`，改为传 `template_id` | P0 |
| `app/hooks/useImageGeneration.ts` | 配合 generation-service 调整 | P1 |
| `app/types/step-flow.ts` | 无需改动（template 对象仍在 state 中，只是不含 prompt） | - |
| `app/hooks/useStepFlow.ts` | 无需改动 | - |
| `app/components/step-flow/StepGenerate.tsx` | 无需改动（不直接使用 prompt） | - |
| `app/components/step-flow/StepStyle.tsx` | 无需改动（不展示 prompt） | - |

---

## 五、详细设计

### 5.1 模板 API 改造

**`GET /api/templates`** 返回字段变更：

```typescript
// 改造前
{
  id, name, description, category, domain, preview_image_url,
  prompt_config,   // ❌ 移除
  prompt_list,     // ❌ 移除
  price_credits, is_active, sort_order, created_at,
}

// 改造后
{
  id, name, description, category, domain, preview_image_url,
  prompt_count,         // ✅ 新增: number，可用提示词数量
  prompt_descriptions,  // ✅ 新增: string[]，提示词的中文描述
  price_credits, is_active, sort_order, created_at,
}
```

**实现**：

```typescript
// app/api/templates/route.ts
const formatted = data.map((t) => {
  const promptList = Array.isArray(t.prompt_list) ? t.prompt_list : [];
  const promptDescs = Array.isArray(t.prompt_descriptions) ? t.prompt_descriptions : [];

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    domain: t.domain,
    preview_image_url: t.preview_image_url,
    prompt_count: promptList.length || 1,
    prompt_descriptions: promptDescs,
    price_credits: t.price_credits,
    is_active: t.is_active,
    sort_order: t.sort_order,
    created_at: t.created_at.toISOString(),
  };
});
```

### 5.2 生成 API 改造

**新增 Zod Schema**：

```typescript
// app/lib/validations.ts

// 模板模式：通过 template_id 生成
export const GenerateFromTemplateSchema = z.object({
  template_id: z.string().min(1, '模板ID不能为空'),
  prompt_index: z.number().int().min(0).default(0),
  image_inputs: z.array(z.string()).max(3).optional(),
  source: z.enum(['openRouter', '302', 'openAi']).optional(),
  // 生成设置
  face_preservation: z.enum(['high', 'medium', 'low']).default('high'),
  creativity_level: z.enum(['conservative', 'balanced', 'creative']).default('conservative'),
});

// 自定义提示词模式
export const GenerateCustomPromptSchema = z.object({
  custom_prompt: z.string().min(1).max(1500),
  image_inputs: z.array(z.string()).max(3).optional(),
  source: z.enum(['openRouter', '302', 'openAi']).optional(),
  face_preservation: z.enum(['high', 'medium', 'low']).default('high'),
  creativity_level: z.enum(['conservative', 'balanced', 'creative']).default('conservative'),
});

// 联合 Schema：二选一
export const GenerateImageV2Schema = z.union([
  GenerateFromTemplateSchema,
  GenerateCustomPromptSchema,
]);
```

**`POST /api/generate-single` 改造逻辑**：

```typescript
// 伪代码
const body = await req.json();

let finalPrompt: string;

if ('template_id' in body) {
  // 模板模式：从 DB 查 prompt
  const template = await prisma.templates.findUnique({
    where: { id: body.template_id },
    select: { prompt_config: true, prompt_list: true },
  });
  if (!template) return jsonError('模板不存在', 404);

  const promptList = Array.isArray(template.prompt_list) ? template.prompt_list : [];
  if (promptList.length > 0) {
    finalPrompt = promptList[body.prompt_index ?? 0] || promptList[0];
  } else {
    const config = template.prompt_config as PromptConfig;
    finalPrompt = config.basePrompt || '';
  }
} else {
  // 自定义模式
  finalPrompt = body.custom_prompt;
}

// 服务端完成增强（face preservation + compose）
const enhancedPrompt = enhancePrompt(finalPrompt, body.face_preservation);
const composedPrompt = composePrompt(enhancedPrompt);
```

**新增服务端函数**：

```typescript
// app/lib/generation-shared.ts

/**
 * 从数据库模板中解析提示词
 */
export async function resolvePromptFromTemplate(
  templateId: string,
  promptIndex: number = 0
): Promise<string> {
  const template = await prisma.templates.findUnique({
    where: { id: templateId },
    select: { prompt_config: true, prompt_list: true },
  });

  if (!template) throw new Error('模板不存在');

  const promptList = Array.isArray(template.prompt_list)
    ? (template.prompt_list as string[]).filter(Boolean)
    : [];

  if (promptList.length > 0) {
    return promptList[promptIndex] || promptList[0];
  }

  const config = template.prompt_config as { basePrompt?: string };
  return config?.basePrompt || '';
}

/**
 * 根据 face preservation 级别增强提示词（从前端移入后端）
 */
export function enhancePromptWithFacePreservation(
  prompt: string,
  level: 'high' | 'medium' | 'low'
): string {
  if (level === 'low') return prompt;

  const faceText = FACE_PRESERVATION_LEVELS[level];
  return `Please edit the provided original image based on the following guidelines:\n\n${faceText}\n\nSPECIFIC EDITING REQUEST: ${prompt}\n\nPlease focus your modifications ONLY on the user's specific requirements while strictly following the face preservation guidelines above. Generate a high-quality edited image that maintains facial identity.`;
}
```

### 5.3 前端 Template 类型改造

```typescript
// app/types/database.ts

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  preview_image_url: string;
  // ❌ 移除: prompt_config: PromptConfig;
  // ❌ 移除: prompt_list?: string[];
  prompt_count: number;              // ✅ 新增
  prompt_descriptions: string[];     // ✅ 新增
  price_credits: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  domain?: string;
}

// PromptConfig 接口保留，但仅用于服务端和管理端
// 可移至 app/types/admin.ts 或保留在 database.ts 但标注 @server-only
```

### 5.4 前端 Hook 改造

**`useTemplateSelection.ts`**：

```typescript
// 改造后
export function useTemplateSelection() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleTemplateSelect = (template: Template): void => {
    setSelectedTemplate(template);
    setSelectedPromptIndex(0);
    setCustomPrompt('');
  };

  const handleCustomPromptChange = (value: string): void => {
    setCustomPrompt(value);
    if (value.trim() && selectedTemplate) {
      setSelectedTemplate(null);
      setSelectedPromptIndex(0);
    }
  };

  // ✅ 新方法：返回生成参数，不返回 prompt 文本
  const getGenerateParams = (): GenerateParams | null => {
    if (selectedTemplate) {
      return {
        mode: 'template',
        templateId: selectedTemplate.id,
        promptIndex: selectedPromptIndex,
      };
    }
    if (customPrompt.trim()) {
      return {
        mode: 'custom',
        customPrompt: customPrompt.trim(),
      };
    }
    return null;
  };

  // ✅ 新方法：判断是否有可用的生成参数
  const hasValidParams = (): boolean => {
    return getGenerateParams() !== null;
  };

  return {
    selectedTemplate,
    selectedPromptIndex,
    customPrompt,
    handleTemplateSelect,
    setSelectedPromptIndex,
    handleCustomPromptChange,
    getGenerateParams,     // ✅ 替代 getCurrentPrompt
    hasValidParams,        // ✅ 新增
  };
}

// 类型定义
type GenerateParams =
  | { mode: 'template'; templateId: string; promptIndex: number }
  | { mode: 'custom'; customPrompt: string };
```

**`useStreamImageGeneration.ts`**：

```typescript
// 改造后 generateImage 签名变更
const generateImage = async (
  originalImage: string,
  params: GenerateParams,  // ✅ 替代 prompt: string
  settings: ImageGenerationSettings,
  source?: ModelConfigSource
): Promise<void> => {
  // ❌ 移除: buildFacePreservationPrompt()
  // ❌ 移除: enhancedPrompt 组装逻辑

  const requestBody = params.mode === 'template'
    ? {
        template_id: params.templateId,
        prompt_index: params.promptIndex,
        image_inputs: [originalImage],
        source,
        face_preservation: settings.facePreservation,
        creativity_level: settings.creativityLevel,
      }
    : {
        custom_prompt: params.customPrompt,
        image_inputs: [originalImage],
        source,
        face_preservation: settings.facePreservation,
        creativity_level: settings.creativityLevel,
      };

  const response = await fetch('/api/generate-single', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  // ... 后续流式处理逻辑不变
};
```

### 5.5 前端组件改造

**`TemplateSelector.tsx`**：

```tsx
// 改造后：展示描述而非 prompt 原文
{selectedTemplate && selectedTemplate.prompt_count > 1 && (
  <div className="pt-8 mt-8 border-t border-white/10">
    <h3>选择光影方案</h3>
    <div className="space-y-4">
      {Array.from({ length: selectedTemplate.prompt_count }).map((_, index) => (
        <div key={index} onClick={() => onPromptIndexChange(index)}>
          <span>光影构筑方案 {index + 1}</span>
          {/* ✅ 展示中文描述，而非英文 prompt */}
          <p>
            {selectedTemplate.prompt_descriptions?.[index] || `风格方案 ${index + 1}`}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

**`GenerationSettings.tsx`**：

```tsx
// 改造后：选中模板时显示模板信息，不显示 prompt
{selectedTemplate ? (
  <div>
    <p>当前选用影像风格: {selectedTemplate.name}</p>
    {selectedTemplate.prompt_count > 1 && (
      <span>— 光影方案 {selectedPromptIndex + 1}</span>
    )}
  </div>
) : (
  <textarea
    value={customPrompt}
    onChange={(e) => onCustomPromptChange(e.target.value)}
    placeholder="构建你的视觉画面..."
    disabled={!!selectedTemplate}
  />
)}
```

### 5.6 批量生成流程改造

**`generation-flow.ts`**：

```typescript
// 改造后：不再从 template 读 prompt
async function generateSingleImage(
  templateId: string,
  promptIndex: number,
  photoUrls: string[]
): Promise<string | null> {
  const res = await fetch('/api/generate-stream', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,     // ✅ 传 ID
      prompt_index: promptIndex,   // ✅ 传索引
      image_inputs: photoUrls,
    }),
  });
  // ... 流式处理逻辑不变
}

export async function startGeneration(params, onProgress) {
  const { template, photos, imageCount } = params;
  const promptCount = template.prompt_count || 1;
  const count = imageCount ? Math.min(imageCount, promptCount) : promptCount;

  for (let i = 0; i < count; i++) {
    const imageDataUrl = await generateSingleImage(
      template.id,  // ✅ 传 template ID
      i,            // ✅ 传 prompt 索引
      photoUrls
    );
    if (imageDataUrl) allImages.push(imageDataUrl);
  }
}
```

**`generation-service.ts`**：

```typescript
// 改造后
// ❌ 移除: getPromptsFromTemplate()

export async function generateAsAuthenticated(input, userId, onProgress) {
  // ...
  const promptCount = input.template.prompt_count || 1;
  const total = Math.max(1, Math.min(8, promptCount));

  for (let i = 0; i < total; i++) {
    const response = await fetch('/api/generate-stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: input.template.id,  // ✅ 传 ID
        prompt_index: i,                 // ✅ 传索引
        image_inputs: input.photos.length > 0 ? [input.photos[0]] : undefined,
      }),
    });
    // ... 后续逻辑不变
  }
}
```

---

## 六、管理端处理

管理端（`/admin/templates`）需要继续读写完整的 prompt 数据，处理方式：

- `/api/admin/templates` 的 GET/POST/PATCH **保持不变**，仍返回 `prompt_config`、`prompt_list`
- 管理端已有 `requireAdmin()` 鉴权保护，只有管理员可访问
- 新增 `prompt_descriptions` 字段的编辑支持

---

## 七、迁移策略

### 阶段一：数据库 + API 改造（不破坏前端）

1. 新增 `prompt_descriptions` 字段（migration）
2. 为现有模板批量生成 `prompt_descriptions`（seed 脚本）
3. `/api/templates` 新增 `prompt_count` 和 `prompt_descriptions` 字段
4. 暂时保留 `prompt_config` 和 `prompt_list` 的返回（向后兼容）

### 阶段二：生成 API 改造

1. `/api/generate-stream` 和 `/api/generate-single` 支持新的 `template_id` + `prompt_index` 模式
2. 同时保留旧的 `prompt` 参数支持（向后兼容）
3. 新增 `resolvePromptFromTemplate()` 和 `enhancePromptWithFacePreservation()` 服务端函数

### 阶段三：前端改造

1. 更新 `Template` 类型定义
2. 改造 `useTemplateSelection` hook
3. 改造 `useStreamImageGeneration` hook
4. 改造 `TemplateSelector` 和 `GenerationSettings` 组件
5. 改造 `generation-flow.ts` 和 `generation-service.ts`

### 阶段四：清理

1. `/api/templates` 移除 `prompt_config` 和 `prompt_list` 的返回
2. 生成 API 移除旧的 `prompt` 参数支持
3. 前端 `Template` 类型移除 `prompt_config` 和 `prompt_list`
4. 移除前端 `buildFacePreservationPrompt()` 等已迁移到后端的函数

---

## 八、兼容性考虑

| 场景 | 处理方式 |
|------|---------|
| 自定义提示词 | 保留 `custom_prompt` 参数，用户仍可自由输入 |
| URL 参数 `?prompt=xxx` | `GenerateSinglePage` 中的 URL prompt 自动填充到自定义提示词 |
| 旧版客户端缓存 | 阶段一保留旧字段，阶段四移除 |
| 管理端 | 不受影响，继续使用完整 prompt 数据 |
| 游客模式 | `generateAsGuest()` 改为使用 mock 数据，不需要真实 prompt |

---

## 九、安全增强（可选）

1. **API 限流**：生成 API 已有速率限制，无需额外处理
2. **模板 ID 验证**：生成 API 需验证 `template_id` 存在且 `is_active = true`
3. **prompt_index 边界检查**：确保索引在 `prompt_list` 范围内
4. **日志脱敏**：服务端日志中 prompt 内容可做截断处理（已有 `filterSensitiveData`）

---

## 十、影响范围总结

### 需要改动的文件（共 ~15 个）

**服务端（6 个）**：
1. `prisma/schema.prisma` — 新增字段
2. `app/api/templates/route.ts` — 移除 prompt 返回
3. `app/api/generate-stream/route.ts` — 支持 template_id 模式
4. `app/api/generate-single/route.ts` — 支持 template_id 模式
5. `app/lib/validations.ts` — 新增 Schema
6. `app/lib/generation-shared.ts` — 新增服务端函数

**前端类型（1 个）**：
7. `app/types/database.ts` — Template 类型调整

**前端 Hooks（2 个）**：
8. `app/hooks/useTemplateSelection.ts` — 移除 getCurrentPrompt
9. `app/hooks/useStreamImageGeneration.ts` — 移除前端 prompt 增强

**前端组件（3 个）**：
10. `app/components/GenerateSinglePage.tsx` — handleGenerate 调整
11. `app/components/GenerateSinglePage/TemplateSelector.tsx` — 展示描述
12. `app/components/GenerateSinglePage/GenerationSettings.tsx` — 移除 prompt 展示

**批量生成（2 个）**：
13. `app/lib/generation-flow.ts` — 传 template_id
14. `app/lib/generation-service.ts` — 移除 getPromptsFromTemplate

### 不需要改动的文件
- `app/api/admin/templates/` — 管理端保持不变
- `app/components/step-flow/StepStyle.tsx` — 不展示 prompt
- `app/components/step-flow/StepGenerate.tsx` — 不直接使用 prompt
- `app/hooks/useStepFlow.ts` — 不涉及 prompt
- `app/types/step-flow.ts` — 不涉及 prompt
- `app/lib/prompt-strategies/` — 用于 generate-prompts，独立链路
