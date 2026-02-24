# 多领域 AI 图片生成平台重构 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 AI 婚纱照平台重构为多领域平台，完成 Prisma + NextAuth + 领域维度迁移。

**Architecture:** Prisma 直连 PostgreSQL 替代 Supabase 客户端；NextAuth Credentials（JWT）替代 Supabase Auth；templates/projects/generations 增加 domain 字段；首页展示领域卡片，路由按 domain 区分。

**Tech Stack:** Next.js 14, Prisma, NextAuth, bcrypt, MinIO, TypeScript

---

## Phase 1: 基础设施

### Task 1: 安装依赖并初始化 Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json`

**Step 1:** 安装依赖

```bash
pnpm add next-auth @prisma/client bcrypt
pnpm add -D prisma @types/bcrypt
```

**Step 2:** 初始化 Prisma

```bash
pnpm exec prisma init
```

**Step 3:** 配置 `prisma/schema.prisma` 的 datasource（provider = "postgresql", url = env("DATABASE_URL")）

**Step 4:** 在 `.env` 和 `.env.example` 添加 `DATABASE_URL`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`

**Step 5:** Commit

```bash
git add package.json pnpm-lock.yaml prisma/ .env.example
git commit -m "chore: add Prisma, NextAuth, bcrypt dependencies"
```

---

### Task 2: 编写完整 Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1:** 定义 User、Profile、Template、Project、Generation、Order、Favorite、image_likes、image_downloads、invite_events、model_configs、single_generations、system_announcements 等表，参考 `init.sql` 结构，User 表包含 id(cuid)、email、password_hash、name、image、emailVerified；Profile 通过 userId 关联 User；Template/Project/Generation 增加 domain 字段（String，默认 'wedding'）

**Step 2:** 运行 `pnpm exec prisma generate` 验证 schema

**Step 3:** Commit

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema with domain field"
```

---

### Task 3: 执行数据库迁移

**Files:**
- Create: `prisma/migrations/xxx_init/migration.sql`（由 prisma migrate 生成）

**Step 1:** 运行 `pnpm exec prisma migrate dev --name init`

**Step 2:** 确认数据库表已创建

**Step 3:** Commit

```bash
git add prisma/migrations/
git commit -m "feat: add initial Prisma migration"
```

---

## Phase 2: 认证层

### Task 4: 创建 Prisma 客户端与 NextAuth 配置

**Files:**
- Create: `app/lib/prisma.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/lib/auth.ts`（导出 authOptions）

**Step 1:** 创建 `app/lib/prisma.ts`，单例 PrismaClient

**Step 2:** 创建 `app/lib/auth.ts`，定义 authOptions：CredentialsProvider，authorize 中查 User、bcrypt.compare 校验密码，返回 user 对象；session strategy: jwt；callbacks: jwt 写入 id，session 写入 user.id

**Step 3:** 创建 `app/api/auth/[...nextauth]/route.ts`，导出 GET/POST handler

**Step 4:** 添加 NEXTAUTH_SECRET 到 .env.example 说明

**Step 5:** Commit

```bash
git add app/lib/prisma.ts app/lib/auth.ts app/api/auth/
git commit -m "feat: add NextAuth Credentials provider"
```

---

### Task 5: 实现注册 API

**Files:**
- Create: `app/api/auth/register/route.ts`

**Step 1:** POST 接收 email、password、name；检查 email 是否已存在；bcrypt.hash 密码；创建 User 和 Profile；返回 201 或错误

**Step 2:** Commit

```bash
git add app/api/auth/register/
git commit -m "feat: add register API"
```

---

### Task 6: 替换 AuthContext 为 NextAuth SessionProvider

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/contexts/AuthContext.tsx`（或创建 SessionProvider 包装 + 自定义 useAuth 封装 useSession）
- Modify: `app/components/AuthModal.tsx`

**Step 1:** 在 layout 根节点包裹 `SessionProvider`（来自 next-auth/react）

**Step 2:** 创建新 AuthContext 或 hook，封装 useSession，提供 user（映射 session.user）、profile（需单独 fetch，根据 session.user.id 查 Profile）、signIn、signOut、signUp（调用 /api/auth/register 后 signIn）

**Step 3:** 修改 AuthModal：signIn 调用 signIn('credentials', { email, password, redirect: false })；signUp 调用 /api/auth/register 再 signIn；移除 signInWithGoogle

**Step 4:** Commit

```bash
git add app/layout.tsx app/contexts/ app/components/AuthModal.tsx
git commit -m "refactor: replace AuthContext with NextAuth SessionProvider"
```

---

### Task 7: 替换所有 API 鉴权

**Files:**
- Modify: 所有使用 `supabase.auth.getUser` 的 API 路由（约 20+ 个）

**Step 1:** 在每个需鉴权的 API 中，import { getServerSession } from 'next-auth'，import { authOptions } from '@/lib/auth'；const session = await getServerSession(authOptions)；if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })；用 session.user.id 替代原 user.id

**Step 2:** 涉及文件：generate-image, generate-stream, generate-prompts, generate-single, upload-image, orders/create, orders/mock/confirm, gallery, generations/[id]/share, invite/claim, images/track-download, identify-image, admin/* 等

**Step 3:** Commit

```bash
git add app/api/
git commit -m "refactor: replace Supabase auth with getServerSession in APIs"
```

---

### Task 8: 替换数据访问为 Prisma

**Files:**
- Modify: 所有使用 `supabase.from(...)` 的 API 和 hooks

**Step 1:** 在 API 路由中，用 prisma.template.findMany、prisma.project.create 等替代 supabase 调用

**Step 2:** 创建 `app/lib/db.ts` 或直接使用 prisma，封装常用查询

**Step 3:** 修改 hooks（useProjects, useTemplates, useFavorites 等）：这些 hooks 当前从 Supabase 客户端拉数据，需改为调用新的 API 或服务端函数；若保持客户端拉取，需新增 Prisma 的 API 路由（如 GET /api/projects、GET /api/templates）供 hooks 调用

**Step 4:** 移除 `app/lib/supabase.ts` 的导入（在完成所有替换后）

**Step 5:** Commit

```bash
git add app/api/ app/hooks/ app/lib/
git commit -m "refactor: replace Supabase client with Prisma in data layer"
```

---

## Phase 3: 领域维度

### Task 9: 定义领域类型与常量

**Files:**
- Create: `app/types/domain.ts`

**Step 1:** 定义 GENERATION_DOMAINS 数组、GenerationDomain 类型、DOMAIN_LABELS 映射（中文）

**Step 2:** Commit

```bash
git add app/types/domain.ts
git commit -m "feat: add domain types and labels"
```

---

### Task 10: 首页领域卡片

**Files:**
- Modify: `app/page.tsx` 或 `app/components/HomePage.tsx`

**Step 1:** 在首页增加领域卡片区域，8 个卡片，每个链接到 `/create/[domain]`

**Step 2:** 文案改为通用「AI 图片生成」

**Step 3:** Commit

```bash
git add app/page.tsx app/components/HomePage.tsx
git commit -m "feat: add domain cards on homepage"
```

---

### Task 11: 动态路由 create/[domain] 与 templates/[domain]

**Files:**
- Create: `app/create/[domain]/page.tsx`
- Create: `app/templates/[domain]/page.tsx`
- Modify: 原 `app/create/page.tsx` 重定向到 `/create/wedding` 或移除

**Step 1:** 创建 `app/create/[domain]/page.tsx`，校验 domain 是否合法，不合法则 404；复用 CreatePage 逻辑，传入 domain

**Step 2:** 创建 `app/templates/[domain]/page.tsx`，按 domain 筛选模板

**Step 3:** 更新导航链接指向新路由

**Step 4:** Commit

```bash
git add app/create/ app/templates/
git commit -m "feat: add domain-scoped create and templates routes"
```

---

### Task 12: 模板与生成 API 支持 domain

**Files:**
- Modify: `app/api/templates/route.ts`
- Modify: `app/api/generate-image/route.ts`、`app/api/generate-stream/route.ts`
- Modify: `app/api/generations` 相关（写入 generation 时带 domain）

**Step 1:** GET /api/templates 支持 query domain，筛选 templates

**Step 2:** 生成 API 请求体增加 domain，写入 generations 表

**Step 3:** Commit

```bash
git add app/api/
git commit -m "feat: add domain filter to templates and generation APIs"
```

---

### Task 13: Prompt 策略按领域拆分

**Files:**
- Create: `app/lib/prompt-strategies/wedding.ts`
- Create: `app/lib/prompt-strategies/id_photo.ts`
- Create: `app/lib/prompt-strategies/anime.ts`
- Create: `app/lib/prompt-strategies/default.ts`
- Modify: `app/api/generate-prompts/route.ts`

**Step 1:** 将现有 generateWeddingPrompts 逻辑移到 wedding.ts

**Step 2:** 为 id_photo、anime 编写对应 prompt 模板

**Step 3:** default.ts 作为兜底

**Step 4:** generate-prompts 路由根据 domain 调用对应策略

**Step 5:** Commit

```bash
git add app/lib/prompt-strategies/ app/api/generate-prompts/
git commit -m "feat: add domain-specific prompt strategies"
```

---

## Phase 4: 清理与收尾

### Task 14: 移除 Supabase 依赖

**Files:**
- Modify: `package.json`
- Delete: `app/lib/supabase.ts`（若仍存在）
- Modify: `.env.example` 移除 Supabase 相关变量

**Step 1:** pnpm remove @supabase/supabase-js

**Step 2:** 删除 supabase.ts，确保无残留引用

**Step 3:** 更新 .env.example

**Step 4:** Commit

```bash
git add package.json .env.example
git rm app/lib/supabase.ts  # 如适用
git commit -m "chore: remove Supabase dependency"
```

---

### Task 15: 更新 middleware 与 auth callback

**Files:**
- Modify: `middleware.ts`
- Delete: `app/auth/callback/page.tsx`

**Step 1:** middleware 检查 NextAuth 的 session（通过 getToken 或 cookie）

**Step 2:** 删除 /auth/callback（Credentials 不需要）

**Step 3:** Commit

```bash
git add middleware.ts
git rm app/auth/callback/page.tsx
git commit -m "refactor: update middleware for NextAuth, remove OAuth callback"
```

---

### Task 16: 文案与品牌统一

**Files:**
- Modify: `app/components/Header.tsx`、`app/layout.tsx`、各页面硬编码「婚纱照」文案

**Step 1:** 替换为「AI 图片生成」或配置化

**Step 2:** Commit

```bash
git add app/components/ app/layout.tsx
git commit -m "refactor: unify branding to AI image generation"
```

---

### Task 17: 种子数据与文档

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` 添加 prisma.seed
- Modify: `README.md`、`CLAUDE.md`

**Step 1:** seed.ts 插入各领域至少 1 个模板

**Step 2:** 更新 README 部署说明（Prisma migrate、环境变量）

**Step 3:** 更新 CLAUDE.md 移除 Supabase 相关描述

**Step 4:** Commit

```bash
git add prisma/seed.ts package.json README.md CLAUDE.md
git commit -m "docs: add seed script and update deployment docs"
```

---

### Task 18: 验证与修复

**Step 1:** 运行 `pnpm typecheck`、`pnpm lint`

**Step 2:** 运行 `pnpm build`

**Step 3:** 修复所有类型错误和 lint 错误

**Step 4:** 手动测试：注册、登录、创建项目、生成图片、查看结果

**Step 5:** Commit

```bash
git add -A
git commit -m "fix: resolve type and lint errors, verify E2E flow"
```

---

## 执行选项

**计划已保存至 `docs/plans/2025-02-24-multi-domain-refactor-implementation.md`**

**两种执行方式：**

1. **Subagent-Driven（本会话）** — 按任务分派子 agent，逐项执行并审查
2. **Parallel Session（新会话）** — 在新会话中使用 executing-plans，批量执行并设置检查点

**请选择执行方式。**
