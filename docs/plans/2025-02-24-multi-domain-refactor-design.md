# 多领域 AI 图片生成平台重构设计

> 设计日期：2025-02-24  
> 状态：已批准

## 目标

将 AI 婚纱照平台重构为多领域 AI 图片生成平台，支持婚纱照、儿童照片、证件照、艺术照、人像、动漫、风景、商品图等 8 大领域；同时完成数据库直连（PostgreSQL + Prisma）和认证迁移（Supabase Auth → NextAuth Credentials）。

## 约束与前提

- **登录方式**：仅邮箱 + 密码（Credentials），无 OAuth
- **数据**：从零开始，无需迁移现有 Supabase 数据
- **存储**：继续使用 MinIO
- **领域展示**：首页展示所有领域卡片，点击进入对应领域的创建流程

---

## 第一节：数据层架构

### Prisma Schema 核心表

| 表 | 说明 |
|----|------|
| `User` | NextAuth 用户（id, email, password_hash, name, image, emailVerified） |
| `Account` / `Session` / `VerificationToken` | NextAuth 标准表（JWT 策略下 Session 可选） |
| `Profile` | 扩展信息（credits, invite_code, invited_by 等），userId 关联 User |
| `Template` | 增加 domain 字段 |
| `Project` / `Generation` | 增加 domain 字段 |
| `Order` / `Favorite` / `image_likes` / `image_downloads` / `invite_events` | 保留，外键指向新 User |

### 领域枚举

```
wedding | children | id_photo | artistic | portrait | anime | landscape | product
```

对应中文：婚纱照 | 儿童照片 | 人物证件照 | 艺术照 | 人像写真 | 动漫 | 风景 | 商品图

### 移除依赖

- Supabase 客户端
- Supabase Auth
- auth.users 相关

---

## 第二节：认证层（NextAuth）

### 配置要点

- **Provider**：仅 CredentialsProvider
- **Session 策略**：`strategy: 'jwt'`
- **密码**：bcrypt 哈希
- **注册**：创建 User + Profile，调用 signIn 自动登录

### 环境变量

- `NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`DATABASE_URL`

### 替换模块

- AuthContext → useSession / signIn / signOut
- API 鉴权 → getServerSession
- 删除 /auth/callback
- middleware 检查 NextAuth session cookie

---

## 第三节：路由与页面结构

### 首页

- 8 个领域卡片，点击进入 `/create/[domain]`
- 文案改为通用「AI 图片生成」

### 路由

| 路径 | 说明 |
|------|------|
| `/` | 首页（领域卡片） |
| `/create/[domain]` | 创建项目 |
| `/templates/[domain]` | 模板列表 |
| `/dashboard` | 工作台（可筛选领域） |
| `/results/[id]` | 生成结果 |
| `/gallery` | 画廊（可筛选领域） |
| `/pricing` | 价格 |

### 品牌

- 统一为「AI 图片生成」或可配置名称

---

## 第四节：API 层与业务逻辑

### 鉴权

- getServerSession 替代 supabase.auth.getUser
- 数据访问：Prisma 替代 Supabase 客户端

### 领域逻辑

- 模板 API：按 domain 筛选
- 生成 API：请求体增加 domain
- generate-prompts：按 domain 选择 prompt 策略

### Prompt 策略

- `app/lib/prompt-strategies/` 按领域拆分
- wedding.ts | id_photo.ts | anime.ts | default.ts

---

## 第五节：错误处理、迁移与部署

### 环境变量

| 变量 | 必填 |
|------|------|
| DATABASE_URL | ✅ |
| NEXTAUTH_URL | ✅ |
| NEXTAUTH_SECRET | ✅ |
| IMAGE_API_* | ✅ |
| MINIO_* | 可选 |

### 移除

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### 部署

1. 配置环境变量
2. `prisma migrate deploy`
3. （可选）`prisma db seed`
4. `pnpm build` 后启动
