# 添加 3 个新域功能 - 执行指南

## 快速开始

已完成代码准备工作，现在需要执行以下步骤来完成功能部署：

### 步骤 1：重命名模板种子脚本

```bash
cd /Users/zhangyanhua/AI/ai-wedding
mv prisma/seed-new-templates-temp.ts prisma/seed-new-templates.ts
```

### 步骤 2：执行域种子脚本

```bash
pnpm tsx prisma/seed-new-domains.ts
```

**预期输出**：
```
Seeding 3 new domains...
  [NEW] AI 孕妇照 (maternity)
  [NEW] AI 毕业照 (graduation)
  [NEW] AI 情侣写真 (couple)

Done! Created: 3, Updated: 0, Total: 3
```

### 步骤 3：执行模板种子脚本

```bash
pnpm tsx prisma/seed-new-templates.ts
```

**预期输出**：
```
Seeding 18 new templates...
  - Maternity: 6 templates
  - Graduation: 6 templates
  - Couple: 6 templates
  [NEW] 温馨孕妇照 (maternity)
  [NEW] 户外孕妇写真 (maternity)
  ...
  [NEW] 居家情侣照 (couple)

Done! Created: 18 templates
```

### 步骤 4：类型检查

```bash
pnpm typecheck
```

**预期输出**：无错误

### 步骤 5：Lint 检查

```bash
pnpm lint
```

**预期输出**：无错误

### 步骤 6：启动开发服务器

```bash
pnpm dev
```

**预期输出**：
```
  ▲ Next.js 14.2.11
  - Local:        http://localhost:3000
  - Ready in XXXms
```

---

## 验证测试

### API 验证

在新终端窗口执行以下命令：

```bash
# 1. 验证域 API（应返回 11 个域）
curl http://localhost:3000/api/domains | jq '.data | length'
# 预期输出: 11

# 2. 验证新域存在
curl http://localhost:3000/api/domains | jq '.data[] | select(.slug == "maternity" or .slug == "graduation" or .slug == "couple") | {slug, name, icon}'
# 预期输出: 3 个域的信息

# 3. 验证 maternity 模板（应返回 6 个）
curl http://localhost:3000/api/templates?domain=maternity | jq '.templates | length'
# 预期输出: 6

# 4. 验证 graduation 模板（应返回 6 个）
curl http://localhost:3000/api/templates?domain=graduation | jq '.templates | length'
# 预期输出: 6

# 5. 验证 couple 模板（应返回 6 个）
curl http://localhost:3000/api/templates?domain=couple | jq '.templates | length'
# 预期输出: 6
```

### 前端验证

1. **首页验证**：
   - 访问 `http://localhost:3000/`
   - 检查是否显示 11 个域卡片
   - 验证新域的图标、颜色、描述是否正确：
     - AI 孕妇照：Baby 图标，粉色渐变
     - AI 毕业照：GraduationCap 图标，蓝色渐变
     - AI 情侣写真：Heart 图标，玫瑰色渐变

2. **模板列表验证**：
   - 点击 "AI 孕妇照" 卡片，跳转到 `/templates/maternity`
   - 验证显示 6 个模板
   - 点击 "AI 毕业照" 卡片，跳转到 `/templates/graduation`
   - 验证显示 6 个模板
   - 点击 "AI 情侣写真" 卡片，跳转到 `/templates/couple`
   - 验证显示 6 个模板

3. **创建项目验证**：
   - 访问 `/create` 页面
   - 验证域选择器包含新域
   - 选择新域后验证模板列表正确显示

---

## 验收清单

完成以下所有项目后，功能即部署成功：

- [ ] 域种子脚本执行成功（3 个新域）
- [ ] 模板种子脚本执行成功（18 个新模板）
- [ ] `pnpm typecheck` 无错误
- [ ] `pnpm lint` 无错误
- [ ] 开发服务器启动成功
- [ ] `GET /api/domains` 返回 11 个域
- [ ] `GET /api/templates?domain=maternity` 返回 6 个模板
- [ ] `GET /api/templates?domain=graduation` 返回 6 个模板
- [ ] `GET /api/templates?domain=couple` 返回 6 个模板
- [ ] 首页显示 11 个域卡片
- [ ] 新域图标、颜色、描述正确显示
- [ ] 点击新域卡片可跳转到模板列表页
- [ ] 模板列表页显示正确数量的模板

---

## 故障排查

### 问题 1：种子脚本执行失败

**症状**：`DATABASE_URL environment variable is not set`

**解决方案**：
```bash
# 确保 .env 文件存在且包含 DATABASE_URL
cat .env | grep DATABASE_URL
```

### 问题 2：图标不显示

**症状**：新域卡片显示默认 Camera 图标

**解决方案**：
1. 检查 `app/types/domain.ts` 是否正确导入 `GraduationCap`
2. 检查 `DOMAIN_ICON_MAP` 是否包含 `GraduationCap: GraduationCap`
3. 重启开发服务器

### 问题 3：模板图片不显示

**症状**：模板预览图显示为空或 404

**解决方案**：
1. 检查 Pexels 图片 URL 是否可访问
2. 检查 `next.config.js` 的 `images.remotePatterns` 是否包含 `images.pexels.com`
3. 如果 Pexels 图片失效，替换为其他图片托管服务

### 问题 4：TypeScript 类型错误

**症状**：`pnpm typecheck` 报错

**解决方案**：
```bash
# 重新生成 Prisma 客户端
pnpm prisma generate

# 再次运行类型检查
pnpm typecheck
```

---

## 后续优化建议

1. **模板图片优化**：
   - 将 Pexels 图片下载到本地
   - 上传到 MinIO 或 OSS
   - 更新模板的 `preview_image_url`

2. **Prompt 优化**：
   - 根据实际生成效果调整 `prompt_list`
   - 优化 `PromptBuilder` 的 `requirements`

3. **模板扩展**：
   - 为每个新域添加更多模板（目标 15-20 个）
   - 增加更多风格和场景

4. **用户反馈**：
   - 收集用户对新域的使用反馈
   - 根据反馈调整模板质量和数量

---

## 相关文档

- 功能规划文档：`.claude/plan/add-three-new-domains.md`
- 实施总结：`.claude/IMPLEMENTATION_SUMMARY.md`
- 项目架构文档：`CLAUDE.md`
- Prisma 数据层文档：`prisma/CLAUDE.md`

---

## 联系支持

如遇到问题，请检查：
1. 数据库连接是否正常
2. 环境变量是否配置正确
3. Node.js 版本是否 >= 18
4. pnpm 是否正确安装

**预估总耗时**：10-15 分钟
