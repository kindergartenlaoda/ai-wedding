# AI Wedding 部署指南

本文档介绍两种生产环境部署方式：**Docker 部署** 和 **PM2 部署**。

---

## 目录

- [前置要求](#前置要求)
- [环境变量配置](#环境变量配置)
- [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
- [方式二：PM2 部署](#方式二pm2-部署)
- [数据库迁移与初始化](#数据库迁移与初始化)
- [Nginx 反向代理](#nginx-反向代理)
- [SSL 证书配置](#ssl-证书配置)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## 前置要求

| 依赖 | Docker 部署 | PM2 部署 |
|------|:-----------:|:--------:|
| Node.js 18+ | - | 必需 |
| pnpm | - | 必需 |
| Docker & Docker Compose | 必需 | - |
| PM2 | - | 必需 |
| PostgreSQL 14+ | Docker 内置 | 需自行安装 |
| Nginx（可选） | 推荐 | 推荐 |

**服务器最低配置**：2 核 CPU / 4GB 内存 / 40GB 磁盘

---

## 环境变量配置

复制示例配置文件并根据实际情况修改：

```bash
cp .env.example .env
```

### 必填变量

```bash
# PostgreSQL 数据库
DATABASE_URL="postgresql://user:password@host:5432/ai_wedding"

# NextAuth 认证
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# AI 图片生成 API
IMAGE_API_MODE=chat                        # chat 或 images
IMAGE_API_BASE_URL=https://api.openai.com
IMAGE_API_KEY=your-api-key
IMAGE_CHAT_MODEL=gemini-2.5-flash-image    # chat 模式使用
IMAGE_IMAGE_MODEL=dall-e-3                 # images 模式使用
```

### 可选变量

```bash
# MinIO 对象存储
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="ai-images"
MINIO_USE_SSL="false"

# 阿里云 OSS（替代 MinIO）
ALI_OSS_REGION="oss-cn-hangzhou"
ALI_OSS_ACCESS_KEY_ID=""
ALI_OSS_ACCESS_KEY_SECRET=""
ALI_OSS_BUCKET=""

# 支付（mock = 模拟 / stripe = 真实支付）
PAYMENT_PROVIDER=mock
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# SSR 认证守卫
ENABLE_SSR_GUARD=true
```

---

## 方式一：Docker 部署（推荐）

### 快速启动

```bash
# 1. 克隆项目
git clone https://github.com/your-org/ai-wedding.git
cd ai-wedding

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置

# 3. 构建并启动（仅应用 + PostgreSQL）
docker compose up -d

# 4. 运行数据库迁移
docker compose exec app npx prisma migrate deploy

# 5. 初始化种子数据（首次部署）
docker compose exec app npx prisma db seed
```

### 启用 MinIO 存储

如果需要使用 MinIO 作为图片存储：

```bash
# 启动包含 MinIO 的完整服务栈
docker compose --profile with-minio up -d
```

启动后：
- MinIO API：`http://localhost:9000`
- MinIO 控制台：`http://localhost:9001`

### 自定义端口

通过环境变量覆盖默认端口：

```bash
APP_PORT=8080 POSTGRES_PORT=5433 docker compose up -d
```

### Docker 命令速查

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f app        # 应用日志
docker compose logs -f postgres   # 数据库日志

# 重新构建（代码更新后）
docker compose build --no-cache app
docker compose up -d app

# 停止所有服务
docker compose down

# 停止并清除数据卷（⚠️ 会删除数据库数据）
docker compose down -v

# 进入应用容器
docker compose exec app sh

# 进入数据库
docker compose exec postgres psql -U aiwedding -d ai_wedding
```

### Docker 构建说明

Dockerfile 采用**多阶段构建**，最终镜像仅包含运行时必需文件：

| 阶段 | 作用 |
|------|------|
| `deps` | 安装 node_modules |
| `builder` | 编译 TypeScript、生成 Prisma Client、构建 Next.js |
| `runner` | 最小化生产镜像（基于 Alpine） |

镜像特点：
- 基于 `node:18-alpine`，体积小
- Next.js standalone 模式，不携带多余 node_modules
- 以非 root 用户 `nextjs` 运行
- 自动健康检查 `/api/health`

---

## 方式二：PM2 部署

### 前置安装

```bash
# 安装 Node.js 18+（推荐使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18

# 安装 pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 安装 PM2
pnpm add -g pm2
```

### 快速部署

```bash
# 1. 克隆项目
git clone https://github.com/your-org/ai-wedding.git
cd ai-wedding

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置（注意 DATABASE_URL 指向你的 PostgreSQL 实例）

# 3. 一键部署（安装依赖 + 构建 + 启动 PM2）
pnpm deploy
```

`pnpm deploy` 会自动执行：
1. 安装依赖 (`pnpm install`)
2. 构建项目 (`pnpm build`)
3. 停止旧进程
4. 启动新的 PM2 进程
5. 保存 PM2 配置

### 手动分步部署

```bash
# 1. 安装依赖
pnpm install

# 2. 生成 Prisma Client
pnpm prisma generate

# 3. 构建项目
pnpm build

# 4. 数据库迁移
pnpm prisma migrate deploy

# 5. 初始化种子数据（首次部署）
pnpm prisma db seed

# 6. 启动 PM2
pnpm pm2:start
```

### PM2 命令速查

```bash
pnpm pm2:start      # 启动应用
pnpm pm2:stop       # 停止应用
pnpm pm2:restart    # 重启应用
pnpm pm2:logs       # 查看日志
pnpm pm2:status     # 查看状态
```

### PM2 高级配置

编辑 `ecosystem.config.js` 自定义配置：

```bash
# 自定义端口
PORT=8081 pnpm pm2:start

# 多实例模式（适合多核服务器）
PM2_INSTANCES=4 pnpm pm2:start

# 自定义内存限制
PM2_MAX_MEMORY=2G pnpm pm2:start
```

### PM2 开机自启

```bash
# 生成开机启动脚本
pm2 startup

# 按提示执行输出的命令（需要 sudo）
# 例如：sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

# 保存当前进程列表
pm2 save
```

### 代码更新与重新部署

```bash
# 拉取最新代码
git pull origin main

# 重新部署
pnpm deploy
```

---

## 数据库迁移与初始化

### Docker 环境

```bash
# 执行迁移
docker compose exec app npx prisma migrate deploy

# 初始化数据
docker compose exec app npx prisma db seed

# 打开 Prisma Studio（调试用）
docker compose exec app npx prisma studio
```

### PM2 / 裸机环境

```bash
# 执行迁移
pnpm prisma migrate deploy

# 初始化数据
pnpm prisma db seed

# 打开 Prisma Studio
pnpm prisma studio
```

---

## Nginx 反向代理

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx
```

### 配置文件

创建 `/etc/nginx/sites-available/ai-wedding`：

```nginx
upstream ai_wedding {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS（配置 SSL 后启用）
    # return 301 https://$host$request_uri;

    client_max_body_size 20M;

    location / {
        proxy_pass http://ai_wedding;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # SSE 流式响应（图片生成）
    location /api/generate-stream {
        proxy_pass http://ai_wedding;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://ai_wedding;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/ai-wedding /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL 证书配置

### 使用 Let's Encrypt（推荐）

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### HTTPS Nginx 配置（certbot 自动生成，仅供参考）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # ... 其余 location 配置同上
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

---

## 监控与日志

### Docker 环境

```bash
# 实时日志
docker compose logs -f

# 应用健康检查
curl http://localhost:3000/api/health

# 容器资源使用
docker stats ai-wedding-app ai-wedding-db
```

### PM2 环境

```bash
# 实时日志
pm2 logs ai-wedding

# 进程监控面板
pm2 monit

# 查看详细状态
pm2 show ai-wedding

# 日志文件位置
# 错误日志: logs/pm2-error.log
# 输出日志: logs/pm2-out.log
```

### 日志轮转（PM2）

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置轮转策略
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

---

## 常见问题

### 1. Docker 构建失败：`prisma generate` 报错

确保 `prisma/schema.prisma` 中的 generator output 路径正确：

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```

### 2. 数据库连接失败

**Docker 环境**：确保 `DATABASE_URL` 使用容器名 `postgres` 作为 host（非 localhost）：

```
DATABASE_URL=postgresql://aiwedding:aiwedding123@postgres:5432/ai_wedding
```

**PM2 环境**：确保 PostgreSQL 服务运行中，且允许外部连接：

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U your_user -d ai_wedding -c "SELECT 1"
```

### 3. 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 使用自定义端口
# Docker: APP_PORT=8080 docker compose up -d
# PM2:    PORT=8080 pnpm pm2:start
```

### 4. MinIO 403 错误

```bash
# 使用内置修复脚本
pnpm fix-minio
pnpm fix-minio:policy
```

### 5. 内存不足（OOM）

- **Docker**：在 `docker-compose.yml` 中添加内存限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

- **PM2**：调整 `PM2_MAX_MEMORY` 环境变量或编辑 `ecosystem.config.js`。

### 6. SSE 流式响应超时

确保 Nginx 配置中 `/api/generate-stream` 的 `proxy_buffering` 设为 `off`，`proxy_read_timeout` 足够长（建议 300s）。

### 7. 静态资源 404

Docker standalone 模式下需确保 `.next/static` 正确复制，检查 Dockerfile 中的 COPY 指令是否完整。
