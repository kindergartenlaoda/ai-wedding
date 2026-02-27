# 添加 3 个新域功能 - 快速开始指南

## 一键部署

已为你准备好自动化部署脚本，只需执行一条命令即可完成所有操作：

```bash
bash scripts/deploy-new-domains.sh
```

这个脚本会自动完成以下步骤：
1. ✅ 重命名模板种子脚本
2. ✅ 执行域种子脚本（添加 3 个新域）
3. ✅ 执行模板种子脚本（添加 18 个模板）
4. ✅ 运行 TypeScript 类型检查
5. ✅ 运行 ESLint 检查
6. ✅ 验证数据库数据

**预计耗时**：2-3 分钟

---

## 手动部署（可选）

如果你想逐步执行，可以按照以下步骤操作：

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
Done! Created: 18 templates
```

### 步骤 4：验证部署

```bash
# 类型检查
pnpm typecheck

# Lint 检查
pnpm lint
```

---

## 启动服务器

部署完成后，启动开发服务器：

```bash
pnpm dev
```

访问 `http://localhost:3000` 验证功能。

---

## 快速验证

在新终端窗口执行以下命令验证 API：

```bash
# 验证域数量（应为 11）
curl http://localhost:3000/api/domains | jq '.data | length'

# 验证新域
curl http://localhost:3000/api/domains | jq '.data[] | select(.slug == "maternity" or .slug == "graduation" or .slug == "couple") | {slug, name, icon}'

# 验证模板数量
curl http://localhost:3000/api/templates?domain=maternity | jq '.templates | length'  # 应为 6
curl http://localhost:3000/api/templates?domain=graduation | jq '.templates | length'  # 应为 6
curl http://localhost:3000/api/templates?domain=couple | jq '.templates | length'  # 应为 6
```

---

## 前端验证清单

访问以下页面验证功能：

- [ ] **首页** (`http://localhost:3000/`)
  - 显示 11 个域卡片
  - 新域图标正确（Baby, GraduationCap, Heart）
  - 新域颜色正确（粉色、蓝色、玫瑰色渐变）

- [ ] **模板列表页**
  - `/templates/maternity` - 显示 6 个孕妇照模板
  - `/templates/graduation` - 显示 6 个毕业照模板
  - `/templates/couple` - 显示 6 个情侣照模板

- [ ] **创建项目页** (`http://localhost:3000/create`)
  - 域选择器包含新域
  - 选择新域后显示对应模板

---

## 故障排查

### 问题 1：数据库连接失败

**症状**：`DATABASE_URL environment variable is not set`

**解决方案**：
```bash
# 检查 .env 文件
cat .env | grep DATABASE_URL

# 确保 DATABASE_URL 已配置
# DATABASE_URL="postgresql://widding:KiAFd54bSRY86sXW@111.228.37.74:5432/widding"
```

### 问题 2：种子脚本执行失败

**症状**：Prisma 客户端错误

**解决方案**：
```bash
# 重新生成 Prisma 客户端
pnpm prisma generate

# 再次执行种子脚本
pnpm tsx prisma/seed-new-domains.ts
pnpm tsx prisma/seed-new-templates.ts
```

### 问题 3：图标不显示

**症状**：新域卡片显示默认 Camera 图标

**解决方案**：
1. 检查 `app/types/domain.ts` 是否正确导入 `GraduationCap`
2. 重启开发服务器：`Ctrl+C` 然后 `pnpm dev`

### 问题 4：模板图片不显示

**症状**：模板预览图显示为空

**解决方案**：
1. 检查 Pexels 图片 URL 是否可访问
2. 检查 `next.config.js` 的 `images.remotePatterns` 是否包含 `images.pexels.com`

---

## 相关文档

- **功能规划**：`.claude/plan/add-three-new-domains.md`
- **完成报告**：`.claude/COMPLETION_REPORT.md`
- **执行指南**：`.claude/EXECUTION_GUIDE.md`
- **实施总结**：`.claude/IMPLEMENTATION_SUMMARY.md`

---

## 技术支持

如遇到问题，请检查：
1. 数据库连接是否正常
2. 环境变量是否配置正确
3. Node.js 版本是否 >= 18
4. pnpm 是否正确安装

---

## 下一步

部署成功后，可以考虑以下优化：

1. **优化模板图片**
   - 将 Pexels 图片下载到本地
   - 上传到 MinIO 或阿里云 OSS
   - 更新模板的 `preview_image_url`

2. **扩展模板数量**
   - 为每个新域添加更多模板（目标 15-20 个）
   - 增加更多风格和场景

3. **优化 Prompt**
   - 根据实际生成效果调整 `prompt_list`
   - 优化 `PromptBuilder` 的 `requirements`

4. **收集用户反馈**
   - 分析用户对新域的使用数据
   - 根据反馈优化模板质量

---

**预祝部署顺利！** 🎉
