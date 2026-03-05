# 多领域 AI 图片生成平台

<div align="center">

基于 AI 技术的多领域图片生成平台，上传照片，选择模板，AI 自动生成专业级作品。支持婚礼、证件、艺术、动漫、风景、商品等多种风格。

**🚀 跨平台支持：Windows | macOS | Linux 一键部署**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-success)](https://github.com/qqzhangyanhua/ai-wedding)

[功能特性](#-核心特性) | [快速部署](#-快速部署) | [本地开发](#-本地开发) | [部署文档](./DEPLOYMENT.md)

</div>

---

## 项目简介

通过 AI 图像生成技术，让用户上传照片并选择场景模板（巴黎、东京、冰岛等），快速生成专业级图片。支持婚礼、证件、艺术、动漫、风景、商品等多领域。

## 核心特性

- **AI 图像生成**：支持 DALL-E 3 / Gemini 2.5 等多种模型
- **人物识别**：自动检测上传照片是否包含人物
- **动态配置**：管理员可动态切换 AI 模型，无需重启
- **模板系统**：70+ 精美场景模板，支持自定义提示词
- **画廊分享**：作品分享、点赞、收藏功能
- **积分系统**：积分购买、邀请奖励机制

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 14 + TypeScript + TailwindCSS |
| **后端** | PostgreSQL + Prisma ORM |
| **存储** | MinIO (自托管) / 阿里云 OSS |
| **认证** | NextAuth (Credentials) |
| **AI** | OpenAI / Gemini / 兼容 API |
| **部署** | Docker Compose / PM2 |

---

## 快速部署

项目提供一键部署脚本，**完全支持 Windows、macOS、Linux 三大平台**，自动检测系统环境并引导配置。

### 🍎 macOS / Linux

```bash
# 1. 克隆项目
git clone https://github.com/qqzhangyanhua/ai-wedding.git
cd ai-wedding

# 2. 一键部署（交互式引导配置 + 启动）
bash deploy.sh
```

### 🪟 Windows (PowerShell)

```powershell
# 1. 克隆项目
git clone https://github.com/qqzhangyanhua/ai-wedding.git
cd ai-wedding

# 2. 允许运行脚本（仅首次需要，以管理员身份运行 PowerShell）
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 3. 一键部署
.\deploy.ps1
```

> **Windows 用户注意**：
> - 需要先安装 [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) 并启用 WSL2
> - 确保 Docker Desktop 已完全启动（系统托盘图标显示为绿色）

### 部署脚本功能

脚本会引导你配置：
- AI API Key 和提供商（OpenAI / OpenRouter / 302.ai）
- 管理员邮箱和密码
- 存储方式（MinIO 自托管 / 阿里云 OSS）
- 自动生成 NEXTAUTH_SECRET

部署完成后访问：
- 应用：`http://localhost:3000`
- MinIO 控制台：`http://localhost:9001`
- 健康检查：`http://localhost:3000/api/health`

### 常用管理命令

所有命令功能完全一致，仅命令格式因操作系统而异：

| 功能 | macOS / Linux | Windows (PowerShell) |
|------|---------------|---------------------|
| 查看状态 | `bash deploy.sh status` | `.\deploy.ps1 status` |
| 查看日志 | `bash deploy.sh logs` | `.\deploy.ps1 logs` |
| 应用日志 | `bash deploy.sh logs app` | `.\deploy.ps1 logs app` |
| 重启服务 | `bash deploy.sh restart` | `.\deploy.ps1 restart` |
| 重新构建 | `bash deploy.sh rebuild` | `.\deploy.ps1 rebuild` |
| 停止服务 | `bash deploy.sh down` | `.\deploy.ps1 down` |
| 备份数据库 | `bash deploy.sh backup` | `.\deploy.ps1 backup` |
| 恢复数据库 | `bash deploy.sh restore` | `.\deploy.ps1 restore` |

> **提示**：Windows 用户可在命令前加 `powershell` 以在 cmd 中运行，例如：`powershell .\deploy.ps1 status`

> 完整部署文档请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 本地开发

### 前置要求

- Node.js 18+
- pnpm（推荐）或 npm
- PostgreSQL 14+

> **跨平台说明**：以下命令在 Windows、macOS、Linux 上完全相同

### 开发步骤

```bash
# 1. 克隆项目
git clone https://github.com/qqzhangyanhua/ai-wedding.git
cd ai-wedding

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# 编辑 .env 文件，配置数据库和 API Key

# 4. 初始化数据库
pnpm prisma migrate deploy
pnpm prisma db seed

# 5. 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 常用命令

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm lint             # 代码检查
pnpm typecheck        # 类型检查
pnpm prisma studio    # 打开数据库管理界面
```

---

## 项目结构

```
ai-wedding/
├── app/                    # Next.js App Router
│   ├── api/                # API 路由
│   ├── components/         # React 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具函数
│   └── types/              # TypeScript 类型
├── prisma/                 # 数据库
│   ├── schema.prisma       # 数据库模型
│   ├── migrations/         # 迁移文件
│   └── seed.ts             # 种子数据
├── deploy.sh               # macOS/Linux 部署脚本
├── deploy.ps1              # Windows 部署脚本
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # Docker 镜像
├── DEPLOYMENT.md           # 部署文档
└── .env.example            # 环境变量模板
```

---

## 使用指南

### 用户端流程

1. **注册登录**：邮箱注册
2. **创建项目**：上传照片 → 选择模板 → 开始生成
3. **查看结果**：查看生成的图片、下载、分享
4. **画廊浏览**：浏览其他用户作品、点赞收藏

### 管理员配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 模型配置 | `/admin/model-configs` | 配置 AI 模型 |
| 模板管理 | `/admin/templates` | 管理生成模板 |
| 公告管理 | `/admin/announcements` | 系统公告 |

管理员账号在首次部署时通过 `.env` 中的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 自动创建。

---

## API 文档

### 图片处理

```
POST /api/generate-image        # 图片生成
POST /api/generate-stream       # 流式图片生成
POST /api/identify-image        # 人物检测
POST /api/upload-image          # 照片上传
```

### 用户功能

```
GET  /api/templates             # 获取模板
GET  /api/gallery               # 获取画廊作品
GET  /api/profile               # 用户信息
```

### 管理员 API

```
GET/POST   /api/admin/templates         # 模板管理
GET/POST   /api/admin/model-configs     # 模型配置
GET/POST   /api/admin/announcements     # 公告管理
```

---

## 环境变量

### 必填变量

| 变量 | 说明 |
|------|------|
| `IMAGE_API_KEY` | AI API Key |
| `IMAGE_API_BASE_URL` | API 提供商地址 |
| `NEXTAUTH_URL` | 应用访问地址 |
| `NEXTAUTH_SECRET` | 会话加密密钥 |
| `ADMIN_EMAIL` | 管理员邮箱 |
| `ADMIN_PASSWORD` | 管理员密码 |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `STORAGE_PROVIDER` | 存储提供商 | `minio` |
| `APP_PORT` | 应用端口 | `3000` |
| `IMAGE_API_MODE` | 生成模式 | `images` |

完整变量说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md#环境变量说明)

---

## 常见问题

### 部署相关

**Q: 如何选择部署方案？**

A: 推荐使用 Docker 一键部署脚本，支持 Windows、macOS、Linux。详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

**Q: Windows 运行脚本报错 "禁止运行脚本"？**

A: 以**管理员身份**运行 PowerShell，执行：
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Q: Windows 上 Docker Desktop 未启动？**

A: 
1. 从开始菜单启动 Docker Desktop
2. 等待系统托盘图标变为绿色（表示就绪）
3. 确保已启用 WSL2（运行 `wsl --install` 并重启）

**Q: macOS 的 Docker Desktop 权限问题？**

A: 系统偏好设置 → 安全性与隐私 → 允许 Docker

**Q: macOS Apple Silicon (M1/M2/M3) 兼容性？**

A: 项目已完全适配 ARM64 架构，可正常使用

### 功能相关

**Q: 上传照片提示"未检测到人物"？**

A: 确保照片中有清晰的人物面部，光线充足。

**Q: 如何切换 AI 模型？**

A: 进入 `/admin/model-configs`，创建新配置并点击"激活"。

**Q: MinIO 出现 403 错误？**

A: 运行 `pnpm fix-minio` 或参考 [DEPLOYMENT.md](./DEPLOYMENT.md#常见问题)。

---

## 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- **TypeScript**: 严格模式，禁止 `any`
- **组件**: 单个组件不超过 500 行
- **样式**: 优先使用 Tailwind CSS

---

## 联系方式

- **Bug 报告**: [Issues](https://github.com/qqzhangyanhua/ai-wedding/issues)
- **功能建议**: [Issues](https://github.com/qqzhangyanhua/ai-wedding/issues)
- **讨论交流**: [Discussions](https://github.com/qqzhangyanhua/ai-wedding/discussions)

---

## 平台支持

本项目经过充分测试，**完全支持**以下操作系统：

| 平台 | 部署方式 | 状态 | 备注 |
|------|---------|------|------|
| **Windows 10/11** | Docker / PM2 | ✅ 完全支持 | 需要 Docker Desktop + WSL2 |
| **macOS (Intel)** | Docker / PM2 | ✅ 完全支持 | 推荐 macOS 12+ |
| **macOS (Apple Silicon)** | Docker / PM2 | ✅ 完全支持 | M1/M2/M3 已适配 ARM64 |
| **Linux (Ubuntu/Debian)** | Docker / PM2 | ✅ 完全支持 | 推荐 Ubuntu 20.04+ |
| **Linux (CentOS/RHEL)** | Docker / PM2 | ✅ 完全支持 | 推荐 CentOS 8+ |

### 一键部署脚本

- **macOS / Linux**: `bash deploy.sh`
- **Windows**: `.\deploy.ps1` (PowerShell)

两个脚本功能完全一致，仅语法适配对应平台。

---

## 许可证

MIT License - 可自由使用、修改、分发

---

<div align="center">

**如果这个项目对你有帮助，请给一个 Star！**

Made with love by AI Wedding Team

Copyright 2025 AI 图片生成. All rights reserved.

</div>
