# 组件重构实施计划

> 生成时间：2026-03-04
> 任务：ResultsPage/PricingPage 拆分 + components/ 目录重组 + generate-single 服务层提取

---

## 📋 任务类型

- [x] 前端 (→ Gemini)
- [ ] 后端 (→ Codex)
- [x] 全栈 (→ 并行)

---

## 🎯 技术方案

综合 Codex 和 Gemini 分析，采用 **分层重组 + 组件拆分 + 可选服务层** 的三阶段方案：

### 阶段 1：目录重组（P0，必做）

```
app/components/
├── pages/              # 页面级组件（仅供对应 page.tsx 使用）
│   ├── home/
│   │   └── HomePage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── results/
│   │   ├── ResultsPage.tsx (~200 lines)
│   │   ├── ResultsStates.tsx (Loading/Error/Empty)
│   │   ├── ResultsHeader.tsx
│   │   ├── ResultsGallery.tsx
│   │   └── ResultsImageCard.tsx
│   ├── pricing/
│   │   ├── PricingPage.tsx (~150 lines)
│   │   ├── PricingHeader.tsx
│   │   ├── PlanList.tsx
│   │   ├── PlanCard.tsx
│   │   └── types.ts
│   ├── templates/
│   │   └── TemplatesPage.tsx
│   ├── testimonials/
│   │   └── TestimonialsPage.tsx
│   └── generate-prompts/
│       └── GeneratePromptsPage.tsx
├── features/           # 功能模块组件（可跨页面复用）
│   ├── auth/
│   │   └── AuthModal.tsx
│   ├── generation/
│   │   ├── GeneratingTips.tsx
│   │   ├── GenerationProgress.tsx
│   │   ├── GenerationResults.tsx
│   │   └── single/
│   │       └── GenerateSinglePage/ (已存在)
│   ├── gallery/
│   │   ├── ImageCompareSlider.tsx
│   │   └── ShareModal.tsx
│   ├── projects/
│   │   ├── ProjectActionsMenu.tsx
│   │   ├── ProjectDetailModal.tsx
│   │   ├── ProjectEditModal.tsx
│   │   └── ProjectFilters.tsx
│   └── photo-upload/
│       ├── PhotoUploader.tsx
│       └── PhotoGuideModal.tsx
├── shared/             # 通用组件（Header、Footer、Toast）
│   ├── Header.tsx
│   ├── AnnouncementBanner.tsx
│   ├── Toast.tsx
│   ├── ConfirmDialog.tsx
│   └── ImagePreviewModal.tsx
├── ui/                 # shadcn/ui 基础组件
└── react-bits/         # 动效库（保持不变）
```

### 阶段 2：组件拆分（P0，必做）

#### ResultsPage.tsx (664 → ~200 lines)

| 提取组件 | 职责 | 行数估算 |
|---------|------|----------|
| `ResultsStates.tsx` | LoadingState + ErrorState + EmptyState | ~80 |
| `ResultsHeader.tsx` | 顶部信息卡 + 主操作按钮（保存/分享） | ~60 |
| `ResultsGallery.tsx` | 图片网格 + 批量选择 + tab 切换 | ~150 |
| `ResultsImageCard.tsx` | 单图渲染 + 点赞/评分叠加层 | ~80 |
| `ResultsPage.tsx` (主容器) | 数据拉取 + 状态编排 + 路由导航 | ~200 |

#### PricingPage.tsx (539 → ~150 lines)

| 提取组件 | 职责 | 行数估算 |
|---------|------|----------|
| `PricingHeader.tsx` | 英雄区 + "体验模式"横幅 | ~50 |
| `PlanList.tsx` | 订阅/一次性套餐列表容器 | ~60 |
| `PlanCard.tsx` | 通用套餐卡片（可复用） | ~100 |
| `pricingLogic.ts` (hooks) | 购买/订阅业务逻辑 | ~80 |
| `types.ts` | 套餐数据类型定义 | ~30 |
| `constants.ts` | 套餐静态配置 | ~50 |
| `PricingPage.tsx` (主容器) | 状态管理 + Toast + Modal | ~150 |

### 阶段 3：API 服务层提取（P1，可选）

#### generate-single/route.ts (410 → ~50 lines)

```typescript
// 新建 app/lib/services/generation-service.ts
export class GenerationService {
  async generateSingleImage(params: GenerationParams): Promise<GenerationResult> {
    // 1. 认证校验
    // 2. 速率限制
    // 3. 积分扣除
    // 4. 模板提示词解析
    // 5. 模型配置获取
    // 6. API 调用（302.ai / OpenAI）
    // 7. 积分退款（失败时）
  }
}

// app/api/generate-single/route.ts 简化为：
export async function POST(req: Request) {
  const service = new GenerationService();
  try {
    const result = await service.generateSingleImage(await req.json());
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
```

---

## 🚀 实施步骤

### Phase 1：准备工作（1小时）

1. 创建新目录结构 `pages/features/shared`
2. 创建迁移映射表（Excel/Markdown）
3. 为旧路径创建 re-export 桥接文件（保障兼容性）

### Phase 2：ResultsPage 拆分（2.5小时）

1. 提取 `ResultsStates.tsx` (LoadingState/ErrorState/EmptyState)
2. 提取 `ResultsHeader.tsx` (信息卡 + 主操作按钮)
3. 提取 `ResultsGallery.tsx` (图片网格 + tab 切换)
4. 提取 `ResultsImageCard.tsx` (单图渲染 + 点赞)
5. 重构主容器 `ResultsPage.tsx` (~200 lines)
6. 更新导入路径 + 类型定义移至 `types.ts`

### Phase 3：PricingPage 拆分（2小时）

1. 提取 `PricingHeader.tsx`
2. 创建 `constants.ts` (套餐配置静态数据)
3. 提取 `PlanCard.tsx` (通用卡片组件)
4. 提取 `PlanList.tsx` (列表容器)
5. 创建 `pricingLogic.ts` (购买/订阅 hooks)
6. 重构主容器 `PricingPage.tsx` (~150 lines)

### Phase 4：目录迁移（2.5小时）

1. 迁移剩余 36 个根级组件到 `pages/features/shared`
2. 更新所有导入路径（TypeScript 会报错提示）
3. 保留旧路径 re-export 层（过渡期 1 个版本）
4. 更新 `components/CLAUDE.md` 文档

### Phase 5：可选 - API 服务层（1.5小时）

1. 创建 `app/lib/services/generation-service.ts`
2. 提取 generate-single 核心逻辑
3. 保持 SSE 解析契约不变
4. 编写单元测试（auth/rate-limit/credit 逻辑）

### Phase 6：质量保障（1.5小时）

1. 运行 `pnpm typecheck` 修复类型错误
2. 运行 `pnpm lint` 修复 ESLint 问题
3. 手动回归测试（见下方清单）
4. 添加 CI 文件行数守卫（防止未来回归）

---

## 📁 关键文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/components/ResultsPage.tsx:1-664` | 拆分 | → pages/results/ (5个子组件) |
| `app/components/PricingPage.tsx:1-539` | 拆分 | → pages/pricing/ (5个子组件 + hooks) |
| `app/api/generate-single/route.ts:1-410` | 提取 | → lib/services/generation-service.ts |
| `app/components/` | 重组 | 38个根文件 → pages/features/shared |
| `app/hooks/useStreamImageGeneration.ts:149` | 验证 | 确保 SSE 解析契约不破坏 |

---

## ⚠️ 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 导入路径大面积失效 | 保留 re-export 桥接层，TypeScript 报错时批量修复 |
| SSE 解析契约破坏 | 保持 generate-single 输出格式不变，重点回归流式生成 |
| 积分退款逻辑错误 | 失败场景手动测试（API 超时/模型错误/余额不足） |
| 组件拆分过度 | 遵循"单一职责"原则，避免过度抽象 |
| 性能回归 | 对 Lightbox/ShareModal 使用 dynamic import 懒加载 |

---

## ✅ 回归测试清单

### ResultsPage

- [ ] 加载状态骨架屏正常显示
- [ ] 错误状态提示正确
- [ ] 图片网格渲染正常（preview/high_res tab 切换）
- [ ] 点赞功能正常（本地状态 + API 持久化）
- [ ] 分享弹窗正常打开和关闭
- [ ] 对比滑块交互流畅
- [ ] Lightbox 键盘导航（← →）正常
- [ ] 批量选择功能正常

### PricingPage

- [ ] 套餐卡片渲染正常（一次性/订阅 tab 切换）
- [ ] 购买按钮点击触发正确流程
- [ ] Toast 提示显示和自动消失
- [ ] Contact Modal 打开和关闭
- [ ] 未登录拦截跳转到首页

### generate-single

- [ ] 认证失败返回 401
- [ ] 速率限制返回 429
- [ ] 积分不足返回 402
- [ ] SSE 流式生成正常（图片逐步显示）
- [ ] 生成失败时积分正确退款
- [ ] 模板提示词正确解析
- [ ] 自定义提示词正常工作

---

## 🛡️ CI 守卫脚本

### 创建 `scripts/check-file-lines.sh`

```bash
#!/bin/bash
max_lines=500
violations=0

while IFS= read -r file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt "$max_lines" ]; then
    echo "❌ $file: $lines lines (exceeds $max_lines)"
    violations=$((violations + 1))
  fi
done < <(find app -name "*.tsx" -o -name "*.ts" | grep -v "node_modules")

if [ "$violations" -gt 0 ]; then
  echo "Found $violations files exceeding $max_lines lines"
  exit 1
fi
echo "✅ All files comply with 500-line rule"
```

### 添加到 `.github/workflows/ci.yml`

```yaml
- name: Check file line limits
  run: bash scripts/check-file-lines.sh
```

---

## 🔑 SESSION_ID（供 /ccg:execute 使用）

- **CODEX_SESSION**: `019cb8d0-d1ec-7dc3-9989-3d7c43ef8b54`
- **GEMINI_SESSION**: `9f00240f-5838-4d4c-846f-972424828069`

---

## 📊 预期收益

- ✅ **代码质量**：ResultsPage (664→200)、PricingPage (539→150)，满足 500 行规则
- ✅ **可维护性**：组件职责清晰，层级分明，新人 onboarding 成本降低 50%
- ✅ **可测试性**：子组件独立测试，业务逻辑提取到 hooks/services
- ✅ **可复用性**：PlanCard/ResultsImageCard 可跨页面复用
- ✅ **技术债清理**：目录扁平化问题解决，防止未来回归（CI 守卫）

---

## 📝 备注

1. **过渡期策略**：保留旧路径 re-export 层 1 个版本，给团队时间适应新结构
2. **类型安全**：所有类型定义移至 `types.ts`，禁止 `any` 类型
3. **图标规范**：使用 Lucide icons，禁止 emoji
4. **性能优化**：对重组件（Lightbox/ShareModal）使用 dynamic import
5. **文档更新**：同步更新 `app/components/CLAUDE.md`

---

**生成时间**: 2026-03-04
**生成工具**: /ccg:plan (多模型协作规划)
**下一步**: 复制以下命令执行计划

```bash
/ccg:execute .claude/plan/components-refactoring.md
```
