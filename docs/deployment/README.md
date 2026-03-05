# 部署指南

本文档提供 AI Wedding 项目的完整部署方案选择和实施指南。

## 快速导航

- [选择部署方案](#选择部署方案)
- [环境变量配置](./environment-vars.md)
- [Docker 生产部署](./production-docker.md)
- [PM2 生产部署](./production-pm2.md)
- [数据库配置](./database-setup.md)
- [存储配置](./storage-setup.md)
- [故障排查](./troubleshooting.md)

---

## 选择部署方案

根据你的规模和需求选择合适的部署方案：

| 方案 | 适用场景 | 优点 | 缺点 | 推荐度 |
|------|---------|------|------|--------|
| **Docker Compose** | 中小型生产环境<br/>1000-10000 用户 | • 环境隔离<br/>• 易于迁移<br/>• 依赖管理简单<br/>• 支持一键部署 | • 需要 Docker 知识<br/>• 资源占用稍高 | ⭐⭐⭐⭐⭐ |
| **PM2** | 单机快速部署<br/>< 1000 用户 | • 配置简单<br/>• 资源占用低<br/>• 启动速度快 | • 无容器隔离<br/>• 依赖系统环境<br/>• 扩展性差 | ⭐⭐⭐ |
| **Kubernetes** | 大规模集群<br/>> 10000 用户 | • 高可用<br/>• 自动扩展<br/>• 服务发现 | • 复杂度极高<br/>• 运维成本高 | ⭐⭐⭐⭐ |

### 推荐策略

**🎯 优先使用 Docker Compose**，除非：
- 你只是快速测试 → 使用 PM2
- 你有专业 K8s 团队 → 使用 Kubernetes

---

## 部署前检查清单

### 1. 系统要求

**硬件要求**：
- CPU: 2 核心以上
- 内存: 4GB 以上（推荐 8GB）
- 磁盘: 20GB 以上可用空间
- 网络: 稳定的互联网连接

**软件要求**：
- Node.js 18+ (PM2 方案)
- Docker 20.10+ 和 Docker Compose 2.0+ (Docker 方案)
- PostgreSQL 14+ (可使用 Docker 提供)
- pnpm 8+ (PM2 方案)

### 2. 必需服务

- ✅ PostgreSQL 数据库（连接字符串）
- ✅ 对象存储（MinIO 或阿里云 OSS）
- ✅ AI 模型 API（OpenAI / Gemini / 兼容服务）
- ✅ 域名和 SSL 证书（生产环境）

### 3. 环境变量准备

在开始部署前，请准备以下关键环境变量：

```bash
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/database

# 认证
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com

# AI 模型
IMAGE_API_KEY=sk-your-api-key
IMAGE_API_BASE_URL=https://api.openai.com

# 存储（MinIO 或 OSS 二选一）
STORAGE_PROVIDER=minio  # 或 oss
```

完整配置请参考 [环境变量配置文档](./environment-vars.md)。

---

## 快速开始

### Docker Compose 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ai-wedding.git
cd ai-wedding

# 2. 配置环境变量
cp .env.example .env
nano .env  # 编辑必需的环境变量

# 3. 启动服务（包含 PostgreSQL + MinIO + 应用）
docker compose --profile with-minio up -d

# 4. 查看日志
docker compose logs -f app

# 5. 访问应用
# 应用: http://localhost:3000
# MinIO Console: http://localhost:9001
```

详细步骤请参考 [Docker 生产部署文档](./production-docker.md)。

### PM2 部署

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ai-wedding.git
cd ai-wedding

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 执行部署脚本
pnpm deploy

# 5. 查看状态
pm2 status
pm2 logs ai-wedding
```

详细步骤请参考 [PM2 生产部署文档](./production-pm2.md)。

---

## 部署后验证

### 1. 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 预期响应
{"status":"ok","timestamp":"2026-03-05T..."}
```

### 2. 数据库连接

```bash
# 进入应用容器（Docker）
docker exec -it ai-wedding-app sh
npx prisma db execute --stdin <<< "SELECT 1;"

# 或直接连接数据库
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### 3. 存储服务

```bash
# MinIO 健康检查
curl http://localhost:9000/minio/health/live

# 测试图片上传（需要登录后获取 token）
curl -X POST http://localhost:3000/api/upload-image \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test.jpg"
```

### 4. AI 模型连接

访问应用并尝试生成图片，检查是否能正常调用 AI 模型。

---

## 常见问题

### 部署失败怎么办？

1. 查看日志：
   ```bash
   # Docker
   docker compose logs app

   # PM2
   pm2 logs ai-wedding
   ```

2. 检查环境变量：
   ```bash
   # Docker
   docker exec ai-wedding-app env | grep DATABASE_URL

   # PM2
   cat .env | grep DATABASE_URL
   ```

3. 参考 [故障排查文档](./troubleshooting.md)

### 如何更新应用？

```bash
# Docker
git pull
docker compose build app
docker compose up -d app

# PM2
git pull
pnpm deploy
```

### 如何备份数据？

```bash
# 备份数据库
docker exec ai-wedding-db pg_dump -U aiwedding ai_wedding > backup.sql

# 备份 MinIO 数据
docker exec ai-wedding-minio mc mirror local/ai-images ./minio-backup/
```

---

## 下一步

- 📖 [配置 Nginx 反向代理](./nginx-config.md)
- 📊 [设置监控和日志](./monitoring.md)
- 🔒 [配置 SSL 证书](./ssl-setup.md)
- ⚡ [性能优化指南](./performance-tuning.md)

---

## 获取帮助

- 🐛 [提交 Issue](https://github.com/your-username/ai-wedding/issues)
- 💬 [讨论区](https://github.com/your-username/ai-wedding/discussions)
- 📧 联系技术支持
