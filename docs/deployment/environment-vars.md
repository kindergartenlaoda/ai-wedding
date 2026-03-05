# 环境变量配置指南

本文档详细说明 AI Wedding 项目的所有环境变量配置。

## 配置优先级

环境变量按重要性分为三类：

- 🔴 **必需变量**：缺少会导致应用无法启动
- 🟡 **推荐变量**：影响核心功能，应该配置
- 🟢 **可选变量**：有默认值，可按需调整

---

## 🔴 必需变量

### 数据库配置

```bash
# PostgreSQL 连接字符串
DATABASE_URL="postgresql://username:password@host:5432/database?schema=public"
```

**说明**：
- 格式：`postgresql://[用户名]:[密码]@[主机]:[端口]/[数据库名]`
- 示例：`postgresql://aiwedding:secret123@localhost:5432/ai_wedding`
- Docker 内部：`postgresql://aiwedding:aiwedding123@postgres:5432/ai_wedding`

**获取方式**：
- 自建：安装 PostgreSQL 后创建数据库和用户
- 云服务：阿里云 RDS、AWS RDS、Supabase 等

### 认证配置

```bash
# NextAuth 会话加密密钥（32 字节随机字符串）
NEXTAUTH_SECRET="your-random-secret-key-here"

# 应用访问地址
NEXTAUTH_URL="https://your-domain.com"
```

**生成 NEXTAUTH_SECRET**：
```bash
# Linux/macOS
openssl rand -base64 32

# 或使用在线工具
# https://generate-secret.vercel.app/32
```

**NEXTAUTH_URL 说明**：
- 开发环境：`http://localhost:3000`
- 生产环境：`https://your-domain.com`（必须使用 HTTPS）

### AI 模型配置

```bash
# AI 模型 API 密钥
IMAGE_API_KEY="sk-your-api-key-here"

# API 基础地址
IMAGE_API_BASE_URL="https://api.openai.com"

# 生成模式：images（OpenAI 风格）或 chat（流式，如 Gemini）
IMAGE_API_MODE="images"
```

**支持的 API 提供商**：
- OpenAI：`https://api.openai.com`
- OpenRouter：`https://openrouter.ai/api/v1`
- 302.ai：`https://api.302.ai`
- 自建兼容服务

**模式选择**：
- `images`：适用于 DALL-E 3、Stable Diffusion 等
- `chat`：适用于 Gemini 2.5 Flash Image 等流式模型

### 存储配置

```bash
# 存储提供商：minio（自托管）或 oss（阿里云）
STORAGE_PROVIDER="minio"
```

**MinIO 配置**（当 `STORAGE_PROVIDER=minio`）：
```bash
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="ai-images"
MINIO_USE_SSL="false"
```

**阿里云 OSS 配置**（当 `STORAGE_PROVIDER=oss`）：
```bash
ALI_OSS_REGION="oss-cn-hangzhou"
ALI_OSS_ACCESS_KEY_ID="your-access-key-id"
ALI_OSS_ACCESS_KEY_SECRET="your-access-key-secret"
ALI_OSS_BUCKET="your-bucket-name"
```

---

## 🟡 推荐变量

### AI 模型详细配置

```bash
# images 模式使用的模型
IMAGE_IMAGE_MODEL="dall-e-3"

# chat 模式使用的模型
IMAGE_CHAT_MODEL="gemini-2.5-flash-image"

# 图片识别模型
IMAGE_IDENTIFY_MODEL="gpt-4o"

# 提示词生成模型
IMAGE_PROMPT_MODEL="gpt-4o"
```

### 应用配置

```bash
# 应用运行端口
PORT=3000

# Node.js 环境
NODE_ENV="production"

# 禁用 Next.js 遥测
NEXT_TELEMETRY_DISABLED=1
```

### 支付配置

```bash
# 支付提供商：mock（测试）或 stripe（生产）
PAYMENT_PROVIDER="mock"

# Stripe Webhook 密钥（生产环境必需）
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
```

---

## 🟢 可选变量

### 功能开关

```bash
# 启用 SSR 路由守卫（保护 /dashboard、/create 等页面）
ENABLE_SSR_GUARD="false"

# 启用访客模式（允许未登录用户生成图片）
ENABLE_GUEST_MODE="true"
```

### 速率限制

```bash
# 每个用户每小时最大生成次数
RATE_LIMIT_PER_HOUR=10

# 每个 IP 每小时最大请求次数
RATE_LIMIT_PER_IP=100
```

### 日志配置

```bash
# 日志级别：debug | info | warn | error
LOG_LEVEL="info"

# 日志格式：json | pretty
LOG_FORMAT="json"
```

### Docker 构建配置

```bash
# Docker 构建标志（内部使用）
DOCKER_BUILD=1
```

### PM2 配置

```bash
# PM2 实例数量（cluster 模式）
PM2_INSTANCES=1

# PM2 最大内存限制
PM2_MAX_MEMORY="1G"

# 应用目录（PM2 使用）
APP_DIR="/path/to/app"
```

### 数据库配置（PostgreSQL）

```bash
# Docker Compose 使用的数据库配置
POSTGRES_USER="aiwedding"
POSTGRES_PASSWORD="aiwedding123"
POSTGRES_DB="ai_wedding"
POSTGRES_PORT=5432
```

### MinIO 配置（Docker Compose）

```bash
# MinIO API 端口
MINIO_API_PORT=9000

# MinIO 控制台端口
MINIO_CONSOLE_PORT=9001
```

---

## 配置示例

### 开发环境配置

```bash
# .env.development
DATABASE_URL="postgresql://aiwedding:dev123@localhost:5432/ai_wedding_dev"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

IMAGE_API_KEY="sk-test-key"
IMAGE_API_BASE_URL="https://api.openai.com"
IMAGE_API_MODE="images"
IMAGE_IMAGE_MODEL="dall-e-3"

STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="ai-images-dev"
MINIO_USE_SSL="false"

PAYMENT_PROVIDER="mock"
ENABLE_GUEST_MODE="true"
LOG_LEVEL="debug"
```

### 生产环境配置（MinIO）

```bash
# .env.production
DATABASE_URL="postgresql://prod_user:strong_password@db.example.com:5432/ai_wedding"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://ai-wedding.example.com"

IMAGE_API_KEY="sk-prod-key-xxxxx"
IMAGE_API_BASE_URL="https://api.openai.com"
IMAGE_API_MODE="images"
IMAGE_IMAGE_MODEL="dall-e-3"

STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="https://minio.example.com"
MINIO_ACCESS_KEY="prod-access-key"
MINIO_SECRET_KEY="prod-secret-key"
MINIO_BUCKET_NAME="ai-images"
MINIO_USE_SSL="true"

PAYMENT_PROVIDER="stripe"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
ENABLE_GUEST_MODE="false"
ENABLE_SSR_GUARD="true"
LOG_LEVEL="info"
NODE_ENV="production"
```

### 生产环境配置（阿里云 OSS）

```bash
# .env.production.oss
DATABASE_URL="postgresql://prod_user:strong_password@db.example.com:5432/ai_wedding"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://ai-wedding.example.com"

IMAGE_API_KEY="sk-prod-key-xxxxx"
IMAGE_API_BASE_URL="https://api.openai.com"
IMAGE_API_MODE="images"

STORAGE_PROVIDER="oss"
ALI_OSS_REGION="oss-cn-hangzhou"
ALI_OSS_ACCESS_KEY_ID="LTAI5xxxxx"
ALI_OSS_ACCESS_KEY_SECRET="xxxxx"
ALI_OSS_BUCKET="ai-wedding-prod"

PAYMENT_PROVIDER="stripe"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
ENABLE_SSR_GUARD="true"
LOG_LEVEL="info"
NODE_ENV="production"
```

---

## 环境变量验证

### 启动前检查

应用启动时会自动验证必需的环境变量，如果缺失会报错：

```
❌ Missing required environment variable: DATABASE_URL
❌ Missing required environment variable: NEXTAUTH_SECRET
```

### 手动验证脚本

```bash
#!/bin/bash
# scripts/check-env.sh

required_vars=(
  "DATABASE_URL"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "IMAGE_API_KEY"
  "STORAGE_PROVIDER"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  else
    echo "✅ Found: $var"
  fi
done

echo "✅ All required environment variables are set"
```

---

## 安全建议

### 1. 密钥管理

- ❌ **不要**将 `.env` 文件提交到 Git
- ✅ 使用 `.env.example` 作为模板
- ✅ 生产环境使用密钥管理服务（AWS Secrets Manager、HashiCorp Vault）

### 2. 密钥轮换

定期更换敏感密钥：
- `NEXTAUTH_SECRET`：每 90 天
- `IMAGE_API_KEY`：按 API 提供商建议
- 数据库密码：每 180 天

### 3. 权限控制

- MinIO/OSS 使用最小权限原则
- 数据库用户只授予必需的权限
- API Key 设置使用限额和 IP 白名单

---

## 故障排查

### 数据库连接失败

```bash
# 测试数据库连接
psql "$DATABASE_URL" -c "SELECT 1;"

# 常见问题
# 1. 主机名错误：检查 host 部分
# 2. 端口未开放：检查防火墙
# 3. 密码错误：检查 password 部分
# 4. 数据库不存在：先创建数据库
```

### MinIO 连接失败

```bash
# 测试 MinIO 连接
curl http://localhost:9000/minio/health/live

# 常见问题
# 1. 端口未映射：检查 docker-compose.yml
# 2. 凭证错误：检查 MINIO_ACCESS_KEY
# 3. Bucket 不存在：手动创建或运行初始化脚本
```

### AI 模型调用失败

```bash
# 测试 API 连接
curl -H "Authorization: Bearer $IMAGE_API_KEY" \
  $IMAGE_API_BASE_URL/v1/models

# 常见问题
# 1. API Key 无效：检查是否过期
# 2. 余额不足：充值账户
# 3. 模型名称错误：检查 IMAGE_IMAGE_MODEL
# 4. 网络问题：检查代理设置
```

---

## 下一步

- 📖 [Docker 生产部署](./production-docker.md)
- 📖 [PM2 生产部署](./production-pm2.md)
- 📖 [数据库配置](./database-setup.md)
- 📖 [存储配置](./storage-setup.md)
