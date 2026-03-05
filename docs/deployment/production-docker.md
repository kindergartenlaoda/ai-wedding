# Docker 生产部署指南

本文档提供使用 Docker Compose 在生产环境部署 AI Wedding 的完整流程。

## 为什么选择 Docker？

- ✅ **环境一致性**：开发、测试、生产环境完全一致
- ✅ **依赖隔离**：不污染宿主机环境
- ✅ **快速部署**：一键启动所有服务
- ✅ **易于迁移**：打包整个应用栈
- ✅ **资源控制**：限制 CPU、内存使用

---

## 前置要求

### 系统要求

- **操作系统**：Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **CPU**：2 核心以上
- **内存**：4GB 以上（推荐 8GB）
- **磁盘**：20GB 以上可用空间
- **网络**：稳定的互联网连接

### 软件要求

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version          # Docker version 20.10+
docker-compose --version  # Docker Compose version 2.0+
```

---

## 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Host                         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │              │  │              │  │              │ │
│  │  PostgreSQL  │  │   MinIO      │  │  AI Wedding  │ │
│  │  (Database)  │  │  (Storage)   │  │    (App)     │ │
│  │              │  │              │  │              │ │
│  │  Port: 5432  │  │  Port: 9000  │  │  Port: 3000  │ │
│  │              │  │  Port: 9001  │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │         │
│         └─────────────────┴──────────────────┘         │
│                    Docker Network                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Nginx (Optional)
                    Port: 80/443
```

---

## 快速部署

### 1. 克隆项目

```bash
# 克隆代码
git clone https://github.com/your-username/ai-wedding.git
cd ai-wedding

# 切换到稳定版本（推荐）
git checkout tags/v1.0.0  # 替换为最新稳定版本
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**最小配置**（必需修改）：

```bash
# 数据库（Docker 内部自动配置，无需修改）
DATABASE_URL="postgresql://aiwedding:aiwedding123@postgres:5432/ai_wedding"

# 认证（必须修改）
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://your-domain.com"  # 替换为你的域名

# AI 模型（必须配置）
IMAGE_API_KEY="sk-your-api-key-here"
IMAGE_API_BASE_URL="https://api.openai.com"
IMAGE_API_MODE="images"

# 存储（使用 Docker 内置 MinIO，无需修改）
STORAGE_PROVIDER="minio"
MINIO_ENDPOINT="http://minio:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="ai-images"
MINIO_USE_SSL="false"
```

完整配置参考 [环境变量配置文档](./environment-vars.md)。

### 3. 启动服务

```bash
# 启动所有服务（PostgreSQL + MinIO + 应用）
docker compose --profile with-minio up -d

# 查看启动日志
docker compose logs -f app

# 等待应用启动完成（约 30-60 秒）
# 看到 "✅ Database initialization completed" 表示成功
```

### 4. 验证部署

```bash
# 检查容器状态
docker compose ps

# 预期输出：
# NAME                 STATUS              PORTS
# ai-wedding-app       Up (healthy)        0.0.0.0:3000->3000/tcp
# ai-wedding-db        Up (healthy)        0.0.0.0:5432->5432/tcp
# ai-wedding-minio     Up (healthy)        0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp

# 健康检查
curl http://localhost:3000/api/health
# 预期响应：{"status":"ok","timestamp":"..."}

# 访问应用
# 应用: http://localhost:3000
# MinIO Console: http://localhost:9001 (账号: minioadmin / minioadmin)
```

---

## 生产环境优化

### 1. 使用外部数据库（推荐）

生产环境建议使用托管数据库服务（阿里云 RDS、AWS RDS）：

```yaml
# docker-compose.yml
services:
  app:
    # ... 其他配置
    environment:
      DATABASE_URL: postgresql://user:pass@external-db.example.com:5432/ai_wedding
    # 移除 depends_on postgres
```

```bash
# 不启动内置 PostgreSQL
docker compose up -d app
```

### 2. 使用阿里云 OSS（推荐）

生产环境建议使用云存储服务：

```bash
# .env
STORAGE_PROVIDER="oss"
ALI_OSS_REGION="oss-cn-hangzhou"
ALI_OSS_ACCESS_KEY_ID="LTAI5xxxxx"
ALI_OSS_ACCESS_KEY_SECRET="xxxxx"
ALI_OSS_BUCKET="ai-wedding-prod"
```

```bash
# 不启动内置 MinIO
docker compose up -d app
```

### 3. 资源限制

编辑 `docker-compose.yml` 添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped
```

### 4. 日志管理

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. 启用 HTTPS

参考 [Nginx 配置文档](./nginx-config.md) 配置反向代理和 SSL。

---

## 数据持久化

### 数据卷说明

Docker Compose 自动创建以下数据卷：

```bash
# 查看数据卷
docker volume ls | grep ai-wedding

# 输出：
# ai-wedding_postgres_data   # PostgreSQL 数据
# ai-wedding_minio_data      # MinIO 对象存储
```

### 备份数据

```bash
# 备份 PostgreSQL
docker exec ai-wedding-db pg_dump -U aiwedding ai_wedding > backup-$(date +%Y%m%d).sql

# 备份 MinIO（需要先安装 mc 客户端）
docker exec ai-wedding-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec ai-wedding-minio mc mirror local/ai-images ./minio-backup/

# 备份数据卷（完整备份）
docker run --rm -v ai-wedding_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data
```

### 恢复数据

```bash
# 恢复 PostgreSQL
cat backup-20260305.sql | docker exec -i ai-wedding-db psql -U aiwedding ai_wedding

# 恢复 MinIO
docker exec ai-wedding-minio mc mirror ./minio-backup/ local/ai-images

# 恢复数据卷
docker run --rm -v ai-wedding_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-data-20260305.tar.gz -C /
```

---

## 更新应用

### 零停机更新（推荐）

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建新镜像（不停止服务）
docker compose build app

# 3. 滚动更新
docker compose up -d --no-deps app

# 4. 验证新版本
curl http://localhost:3000/api/health

# 5. 查看日志
docker compose logs -f app
```

### 回滚到旧版本

```bash
# 1. 查看镜像历史
docker images | grep ai-wedding

# 2. 标记当前版本
docker tag ai-wedding-app:latest ai-wedding-app:backup

# 3. 回滚到旧版本
git checkout tags/v1.0.0
docker compose build app
docker compose up -d app
```

---

## 监控和日志

### 查看日志

```bash
# 实时查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f minio

# 查看最近 100 行日志
docker compose logs --tail=100 app

# 查看特定时间段日志
docker compose logs --since 2026-03-05T10:00:00 app
```

### 容器状态监控

```bash
# 查看容器状态
docker compose ps

# 查看资源使用
docker stats ai-wedding-app

# 查看容器详细信息
docker inspect ai-wedding-app
```

### 健康检查

```bash
# 应用健康检查
curl http://localhost:3000/api/health

# 数据库健康检查
docker exec ai-wedding-db pg_isready -U aiwedding

# MinIO 健康检查
curl http://localhost:9000/minio/health/live
```

---

## 故障排查

### 应用无法启动

```bash
# 1. 查看容器日志
docker compose logs app

# 2. 检查环境变量
docker exec ai-wedding-app env | grep DATABASE_URL

# 3. 检查数据库连接
docker exec ai-wedding-app npx prisma db execute --stdin <<< "SELECT 1;"

# 4. 重新构建
docker compose down
docker compose build --no-cache app
docker compose up -d
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker compose ps postgres

# 检查数据库日志
docker compose logs postgres

# 手动连接测试
docker exec -it ai-wedding-db psql -U aiwedding -d ai_wedding

# 检查网络连接
docker exec ai-wedding-app ping postgres
```

### MinIO 403 错误

```bash
# 运行修复脚本
docker exec ai-wedding-app sh -c "cd /app && pnpm fix-minio"

# 或手动修复
docker exec ai-wedding-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec ai-wedding-minio mc anonymous set download local/ai-images
```

### 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune

# 查看磁盘使用
docker system df
```

更多问题参考 [故障排查文档](./troubleshooting.md)。

---

## 安全加固

### 1. 修改默认密码

```bash
# PostgreSQL
POSTGRES_PASSWORD="$(openssl rand -base64 32)"

# MinIO
MINIO_ACCESS_KEY="$(openssl rand -hex 16)"
MINIO_SECRET_KEY="$(openssl rand -base64 32)"
```

### 2. 限制端口暴露

```yaml
# docker-compose.yml
services:
  postgres:
    ports:
      - "127.0.0.1:5432:5432"  # 只监听本地

  minio:
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
```

### 3. 使用 Docker Secrets

```yaml
# docker-compose.yml
services:
  app:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

### 4. 定期更新镜像

```bash
# 更新基础镜像
docker compose pull

# 重新构建应用
docker compose build --no-cache

# 重启服务
docker compose up -d
```

---

## 性能优化

### 1. 启用 Next.js 缓存

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - next_cache:/app/.next/cache

volumes:
  next_cache:
```

### 2. 使用多阶段构建

已在 `Dockerfile` 中实现，无需额外配置。

### 3. 启用 Cluster 模式

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 2  # 启动 2 个实例
```

### 4. 配置 PostgreSQL 连接池

```bash
# .env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10"
```

---

## 下一步

- 📖 [配置 Nginx 反向代理](./nginx-config.md)
- 📊 [设置监控和告警](./monitoring.md)
- 🔒 [配置 SSL 证书](./ssl-setup.md)
- ⚡ [性能调优指南](./performance-tuning.md)

---

## 常见问题

**Q: Docker 部署和 PM2 部署有什么区别？**

A: Docker 提供环境隔离和一致性，适合生产环境；PM2 更轻量，适合快速测试。

**Q: 可以在 Windows 上使用 Docker 部署吗？**

A: 可以，但推荐使用 Linux 服务器。Windows 需要安装 Docker Desktop。

**Q: 如何扩展到多台服务器？**

A: 使用 Docker Swarm 或 Kubernetes 进行集群部署。

**Q: 数据库和存储可以使用云服务吗？**

A: 强烈推荐！生产环境建议使用阿里云 RDS + OSS 或 AWS RDS + S3。
