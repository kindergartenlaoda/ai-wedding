# 模板页面跳转修复说明

## 问题描述

从 `/templates` 页面点击"应用此方案"按钮后，用户被要求重新选择领域，而不是直接进入上传照片步骤。

## 根本原因

1. 用户点击"应用此方案" → 跳转到 `/create?templateId=xxx`
2. `useStepFlow` hook 在初始化时调用 `getInitialState(searchParams, templates)`
3. 但此时 `templates` 数组可能还在异步加载中（为空数组）
4. `getInitialState` 找不到对应的模板，回退到 `{ step: 'domain', domain: null }`
5. 用户看到领域选择页面

## 解决方案

在 `app/hooks/useStepFlow.ts` 中添加了一个 `useEffect`：

```typescript
// Re-initialize from URL when templates load
useEffect(() => {
  if (hasInitializedFromUrl.current || templates.length === 0) return;

  const legacyId = searchParams.get('templateId');
  const templateId = legacyId || searchParams.get('template');

  if (templateId && state.step === 'domain') {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      hasInitializedFromUrl.current = true;
      dispatch({ type: 'SELECT_TEMPLATE', template });
    }
  }
}, [templates, searchParams, state.step]);
```

### 工作原理

1. 监听 `templates` 数组的变化
2. 当 `templates` 加载完成（length > 0）且当前在 `domain` 步骤时
3. 重新检查 URL 的 `templateId` 参数
4. 如果找到对应模板，自动 dispatch `SELECT_TEMPLATE` action
5. 状态机自动转换到 `upload` 步骤
6. 使用 `hasInitializedFromUrl` ref 防止重复初始化

## 测试步骤

### 1. 启动开发服务器
```bash
pnpm dev
```

### 2. 测试流程
1. 访问 http://localhost:3000/templates
2. 浏览模板列表
3. 点击任意模板的"应用此方案"按钮
4. **预期结果**：直接进入上传照片页面（step='upload'）
5. **不应该看到**：领域选择页面（step='domain'）

### 3. 验证 URL
- URL 应该是：`/create?template=xxx&domain=xxx`
- 页面标题应该显示："3. 上传照片"
- 左侧应该显示选中的模板预览图
- 右侧应该显示照片上传区域

## 技术细节

### 状态机流程

**修复前**：
```
/templates 点击 → /create?templateId=xxx →
templates=[] → getInitialState 找不到模板 →
{ step: 'domain' } → 用户看到领域选择
```

**修复后**：
```
/templates 点击 → /create?templateId=xxx →
templates=[] → getInitialState 找不到模板 →
{ step: 'domain' } → useEffect 监听到 templates 加载完成 →
dispatch SELECT_TEMPLATE → { step: 'upload' } → 用户看到上传页面
```

### 相关文件

- `app/hooks/useStepFlow.ts` - 修复的核心文件
- `app/templates/page.tsx` - 模板列表页面
- `app/components/TemplatesPage.tsx` - 模板列表组件
- `app/components/step-flow/StepFlow.tsx` - 步骤流程组件
- `app/types/step-flow.ts` - 状态机类型定义

## 影响范围

- ✅ 从模板页面跳转：现在可以正常工作
- ✅ 直接访问 `/create?templateId=xxx`：现在可以正常工作
- ✅ 从 `/create` 手动选择领域和模板：不受影响
- ✅ 草稿恢复功能：不受影响
- ✅ 返回按钮：不受影响

## 提交信息

```
fix(step-flow): 修复从模板页面跳转时需要重新选择领域的问题

问题描述：
- 从 /templates 页面点击"应用此方案"跳转到 /create?templateId=xxx
- 由于 templates 数组异步加载，getInitialState 找不到模板
- 导致回退到 domain 步骤，用户需要重新选择领域

解决方案：
- 在 useStepFlow 中添加 effect 监听 templates 加载
- 当 templates 加载完成且当前在 domain 步骤时
- 重新检查 URL 的 templateId 参数并自动跳转到 upload 步骤
- 使用 hasInitializedFromUrl ref 防止重复初始化

影响范围：
- app/hooks/useStepFlow.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## 后续优化建议

1. **添加加载状态**：在 templates 加载期间显示 loading 状态，避免用户看到短暂的 domain 页面
2. **URL 参数统一**：考虑将 `templateId` 统一为 `template`，减少兼容性代码
3. **添加单元测试**：为 `useStepFlow` hook 添加测试用例
4. **错误处理**：如果 templateId 无效，显示友好的错误提示

## 相关 Issue

- 用户反馈：从模板页面点击"应用此方案"后需要重新选择领域
- 预期行为：应该直接进入上传照片步骤
