# AI Wedding - 项目状态文档

**最后更新**: 2026-03-05

---

## 📋 项目概览

**多领域 AI 图片生成平台** - 基于 Next.js 14 + PostgreSQL + Prisma 的全栈应用，支持 9 个领域（婚礼、证件、艺术、动漫、风景、商品等）的 AI 图片生成。

---

## ✅ 已完成的重要功能

### 核心功能
- ✅ **AI 图片生成**（支持 OpenAI / Gemini / 302.ai 等多种 API）
- ✅ **模板系统**（79 个预置模板 + 自定义模板）
- ✅ **人物识别**（自动检测上传照片是否包含人物）
- ✅ **积分系统**（购买、消费、邀请奖励）
- ✅ **画廊分享**（点赞、收藏、评论）
- ✅ **动态模型配置**（管理员可动态切换 AI 模型）

### 部署方案
- ✅ **Docker 一键部署**（完整的 deploy.sh / deploy.ps1 脚本）
- ✅ **PM2 部署**（传统 Node.js 部署方案）
- ✅ **多环境支持**（开发 / 测试 / 生产）
- ✅ **行结束符自动修复**（Windows CRLF → Linux LF）

### 安全增强
- ✅ **API Key 保护**（服务端专用，不暴露给客户端）
- ✅ **信用额度冻结机制**（防止重复扣费）
- ✅ **健康检查端点**（`/api/health`）
- ✅ **数据库权限验证**

---

## 🚀 快速开始

### Docker 部署（推荐）

**Windows**:
```powershell
.\deploy.ps1
```

**macOS / Linux**:
```bash
bash deploy.sh
```

### 本地开发

```bash
pnpm install
cp .env.example .env
# 编辑 .env 配置数据库和 API Key
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

---

## 📁 项目结构

```
ai-wedding/
├── app/                    # Next.js 14 应用目录
│   ├── api/               # 41 个 API 路由
│   ├── components/        # 72 个 UI 组件
│   ├── hooks/             # 20 个自定义 Hook
│   ├── lib/               # 32 个工具模块
│   ├── types/             # 14 个类型定义
│   └── admin/             # 管理后台页面
├── prisma/                 # 数据库层
│   ├── schema.prisma      # 15 个数据模型
│   ├── migrations/        # 数据库迁移
│   └── seed.ts            # 初始数据
├── scripts/                # 运维脚本
├── deploy.sh / deploy.ps1  # 部署脚本
├── docker-compose.yml      # Docker 配置
├── Dockerfile              # 多阶段构建
└── .env.example            # 环境变量模板
```

---

## 🔑 环境变量说明

### 必填配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接 | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | 应用访问地址 | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | 会话加密密钥 | `openssl rand -base64 32` |
| `IMAGE_API_KEY` | AI API 密钥 | `sk-xxx` |
| `IMAGE_API_BASE_URL` | API 提供商地址 | `https://api.openai.com` |
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 管理员密码 | 至少 6 位 |

### 可选配置

- `STORAGE_PROVIDER`: `minio` (默认) 或 `oss`
- `IMAGE_API_MODE`: `images` (默认) 或 `chat` (流式)
- `PAYMENT_PROVIDER`: `mock` (默认) 或 `stripe`

详见：`.env.example`

---

## 🛠️ 常用命令

### 部署管理

```bash
# 查看服务状态
bash deploy.sh status       # Linux/macOS
.\deploy.ps1 status          # Windows

# 查看日志
bash deploy.sh logs
bash deploy.sh logs app      # 仅应用日志

# 重启服务
bash deploy.sh restart

# 重新构建
bash deploy.sh rebuild

# 备份数据库
bash deploy.sh backup
```

### 开发命令

```bash
pnpm dev                     # 开发服务器
pnpm build                   # 构建生产版本
pnpm lint                    # ESLint 检查
pnpm typecheck               # TypeScript 类型检查
pnpm prisma studio           # 数据库管理界面
pnpm prisma db seed          # 初始化种子数据
```

---

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| **README.md** | 项目主文档（快速开始） |
| **DEPLOYMENT.md** | 完整部署指南（Docker / PM2） |
| **CLAUDE.md** | 项目架构和开发规范 |
| **AGENTS.md** | AI Agent 使用指南 |
| **CHANGELOG.md** | 版本更新记录 |
| **prisma/CLAUDE.md** | 数据库模型文档 |
| **app/*/CLAUDE.md** | 各模块详细文档 |

---

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 14, React 18, TypeScript, TailwindCSS, shadcn/ui |
| **后端** | Next.js API Routes, NextAuth, Zod 验证 |
| **数据库** | PostgreSQL 16, Prisma ORM 7.4 |
| **存储** | MinIO (自托管) / 阿里云 OSS |
| **AI** | OpenAI API, Gemini API, 兼容 API |
| **部署** | Docker Compose, PM2, Nginx |

---

## 🐛 已知问题与解决方案

### Windows 部署问题

**问题**: `exec /app/docker-entrypoint.sh: no such file or directory`

**原因**: Windows Git 默认将 LF 转换为 CRLF

**解决**: 部署脚本已自动处理（`git config core.autocrlf input` + 自动转换）

### MinIO 403 错误

**问题**: 上传图片后无法访问

**解决**: 
```bash
pnpm fix-minio              # 修复权限和策略
pnpm fix-minio:policy       # 仅修复策略
pnpm fix-minio:urls         # 刷新 URL
```

### 数据库连接失败

**Docker 环境**: `DATABASE_URL` 由 `docker-compose.yml` 自动设置，无需手动配置

**PM2 环境**: 确保 `.env` 中 `DATABASE_URL` 正确指向 PostgreSQL 实例

---

## 🚧 技术债务与优化方向

### 当前待优化
1. ⚠️ **测试覆盖率** - 无自动化测试（建议添加 Vitest + Playwright）
2. ⚠️ **监控和日志** - 生产环境建议接入 Sentry / LogDNA
3. ⚠️ **性能优化** - 图片压缩和 CDN 加速
4. ⚠️ **国际化** - 目前仅支持中文

### 未来功能
- 🔮 视频生成支持
- 🔮 批量生成优化
- 🔮 模板市场（用户上传模板）
- 🔮 API 开放平台

---

## 📞 获取帮助

- **GitHub Issues**: https://github.com/qqzhangyanhua/ai-wedding/issues
- **部署问题**: 参考 `DEPLOYMENT.md` 的故障排查章节
- **开发问题**: 参考 `CLAUDE.md` 的架构文档

---

## 📝 项目清理记录

### 2026-03-05 清理操作

**删除的文件**:
- ❌ `quick-deploy.ps1` / `quick-deploy.sh` - 功能已被 `deploy.ps1` / `deploy.sh` 覆盖
- ❌ `QUICK_START.md` - 内容已合并到 `README.md`
- ❌ `一键部署说明.md` - 内容已合并到 `README.md`
- ❌ `.claude/` 下 21 个临时总结文档 - 保留 `README.md` 和 `CLAUDE.md`

**保留的核心文件**:
- ✅ `deploy.ps1` / `deploy.sh` - 完整部署脚本
- ✅ `README.md` - 项目主文档
- ✅ `DEPLOYMENT.md` - 部署指南
- ✅ `CLAUDE.md` - 架构文档
- ✅ `docker-entrypoint.sh` - Docker 启动脚本
- ✅ `.gitattributes` - Git 行结束符配置

**文件结构更清晰，无重复内容。**

---

**项目维护者**: AI Wedding Team  
**最后更新**: 2026-03-05  
**版本**: v0.1.0
