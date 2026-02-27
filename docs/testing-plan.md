# 后端测试计划

## 测试框架配置

### 推荐技术栈
- **测试框架**: Vitest (与 Next.js 14 兼容性好)
- **断言库**: Vitest 内置
- **Mock 工具**: Vitest Mock + MSW (Mock Service Worker)
- **数据库 Mock**: Prisma Mock

### 安装依赖
```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
pnpm add -D msw prisma-mock
```

### 配置文件
创建 `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
});
```

---

## 关键测试用例

### 1. SSRF 安全漏洞测试 (Critical)

**文件**: `tests/lib/generation-shared.test.ts`

**测试场景**:
- ✅ 拒绝私网 IP (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- ✅ 拒绝 localhost (127.0.0.1, ::1)
- ✅ 拒绝云元数据地址 (169.254.169.254)
- ✅ 拒绝 file:// 协议
- ✅ 允许合法外部 URL
- ✅ 超时控制 (10秒)
- ✅ 文件大小限制 (10MB)
- ✅ MIME 类型白名单验证

**示例代码**:
```typescript
import { describe, it, expect } from 'vitest';
import { convertUrlToBase64 } from '@/lib/generation-shared';

describe('SSRF Protection', () => {
  it('should reject private IP addresses', async () => {
    await expect(convertUrlToBase64('http://10.0.0.1/image.jpg'))
      .rejects.toThrow('Access to private or sensitive URLs is not allowed');

    await expect(convertUrlToBase64('http://192.168.1.1/image.jpg'))
      .rejects.toThrow('Access to private or sensitive URLs is not allowed');
  });

  it('should reject localhost', async () => {
    await expect(convertUrlToBase64('http://localhost/image.jpg'))
      .rejects.toThrow('Access to private or sensitive URLs is not allowed');
  });

  it('should reject cloud metadata addresses', async () => {
    await expect(convertUrlToBase64('http://169.254.169.254/latest/meta-data'))
      .rejects.toThrow('Access to private or sensitive URLs is not allowed');
  });

  it('should allow valid external URLs', async () => {
    // Mock fetch for valid URL
    // Test implementation
  });
});
```

---

### 2. prompt_index 越界处理测试 (Major)

**文件**: `tests/lib/generation-shared.test.ts`

**测试场景**:
- ✅ 负数索引返回 400 错误
- ✅ 超出范围索引返回 400 错误
- ✅ 有效索引正常工作
- ✅ 错误信息包含有效范围提示

**示例代码**:
```typescript
describe('Prompt Index Validation', () => {
  it('should reject negative prompt_index', async () => {
    await expect(resolvePromptFromTemplate('template-id', -1))
      .rejects.toThrow('Invalid prompt_index: must be between 0 and');
  });

  it('should reject out-of-range prompt_index', async () => {
    // Mock template with 3 prompts
    await expect(resolvePromptFromTemplate('template-id', 5))
      .rejects.toThrow('Invalid prompt_index: must be between 0 and 2, got 5');
  });

  it('should accept valid prompt_index', async () => {
    // Mock template with 3 prompts
    const result = await resolvePromptFromTemplate('template-id', 1);
    expect(result).toBeDefined();
  });
});
```

---

### 3. 错误信息脱敏测试 (Major)

**文件**: `tests/lib/logger.test.ts`

**测试场景**:
- ✅ API keys 被脱敏
- ✅ 文件路径被移除
- ✅ IP 地址被脱敏
- ✅ 正常错误信息保留

**示例代码**:
```typescript
import { sanitize } from '@/lib/logger';

describe('Error Sanitization', () => {
  it('should sanitize API keys', () => {
    const message = 'API error: sk-1234567890abcdefghijklmnopqrstuvwxyz';
    const sanitized = sanitize.errorMessage(message);
    expect(sanitized).not.toContain('sk-1234567890abcdefghijklmnopqrstuvwxyz');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('should sanitize file paths', () => {
    const message = 'Error in /Users/admin/secret/config.json';
    const sanitized = sanitize.errorMessage(message);
    expect(sanitized).not.toContain('/Users/admin/secret/config.json');
    expect(sanitized).toContain('[PATH]');
  });

  it('should sanitize IP addresses', () => {
    const message = 'Connection failed to 192.168.1.100';
    const sanitized = sanitize.errorMessage(message);
    expect(sanitized).not.toContain('192.168.1.100');
    expect(sanitized).toContain('[IP]');
  });
});
```

---

### 4. 模板缓存测试 (Major)

**文件**: `tests/lib/generation-shared.test.ts`

**测试场景**:
- ✅ 首次查询从数据库获取
- ✅ 后续查询从缓存获取
- ✅ 缓存过期后重新查询
- ✅ clearTemplateCache 正确清除缓存

**示例代码**:
```typescript
describe('Template Cache', () => {
  it('should cache template on first query', async () => {
    // Mock Prisma query
    const result1 = await resolvePromptFromTemplate('template-id', 0);
    const result2 = await resolvePromptFromTemplate('template-id', 0);

    // Verify Prisma was called only once
    expect(prismaMock.templates.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should refresh cache after TTL expires', async () => {
    // Mock time progression
    // Test cache expiration
  });

  it('should clear cache when clearTemplateCache is called', async () => {
    await resolvePromptFromTemplate('template-id', 0);
    clearTemplateCache('template-id');
    await resolvePromptFromTemplate('template-id', 0);

    // Verify Prisma was called twice
    expect(prismaMock.templates.findUnique).toHaveBeenCalledTimes(2);
  });
});
```

---

### 5. GenerateImageV2Schema 验证测试 (Minor)

**文件**: `tests/lib/validations.test.ts`

**测试场景**:
- ✅ 模板模式验证通过
- ✅ 自定义模式验证通过
- ✅ 同时提供 template_id 和 custom_prompt 返回错误
- ✅ 缺少 mode 字段返回错误
- ✅ 额外字段被拒绝 (strict mode)

**示例代码**:
```typescript
import { GenerateImageV2Schema } from '@/lib/validations';

describe('GenerateImageV2Schema Validation', () => {
  it('should accept template mode', () => {
    const result = GenerateImageV2Schema.safeParse({
      mode: 'template',
      template_id: 'template-123',
      prompt_index: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should accept custom mode', () => {
    const result = GenerateImageV2Schema.safeParse({
      mode: 'custom',
      custom_prompt: 'A beautiful landscape',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid mode', () => {
    const result = GenerateImageV2Schema.safeParse({
      mode: 'invalid',
      template_id: 'template-123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject extra fields in strict mode', () => {
    const result = GenerateImageV2Schema.safeParse({
      mode: 'template',
      template_id: 'template-123',
      extra_field: 'should be rejected',
    });
    expect(result.success).toBe(false);
  });
});
```

---

### 6. 模板过滤测试 (Minor)

**文件**: `tests/api/templates.test.ts`

**测试场景**:
- ✅ prompt_count = 0 的模板被过滤
- ✅ prompt_count > 0 的模板被返回
- ✅ is_available 字段正确设置

---

## 测试覆盖率目标

- **Critical 功能**: 100% 覆盖
- **Major 功能**: 80%+ 覆盖
- **Minor 功能**: 70%+ 覆盖
- **整体目标**: 70%+ 代码覆盖率

---

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行测试 UI
pnpm test:ui

# 监听模式
pnpm test:watch
```

---

## CI/CD 集成

在 `.github/workflows/test.yml` 中添加:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 下一步行动

1. ✅ 配置 Vitest 测试框架
2. ✅ 创建 `tests/setup.ts` 配置文件
3. ✅ 实现 SSRF 防护测试（最高优先级）
4. ✅ 实现 prompt_index 越界测试
5. ✅ 实现错误脱敏测试
6. ✅ 实现模板缓存测试
7. ✅ 实现 schema 验证测试
8. ✅ 配置 CI/CD 自动测试
9. ✅ 达到 70% 测试覆盖率目标

---

## 注意事项

- 所有测试必须独立运行，不依赖外部服务
- 使用 Mock 隔离数据库和外部 API
- 测试应该快速执行（< 30秒）
- 测试失败时提供清晰的错误信息
- 定期更新测试以匹配代码变更
