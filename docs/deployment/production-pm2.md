# PM2 生产部署指南

本文档提供使用 PM2 在生产环境部署 AI Wedding 的完整流程。

## 什么是 PM2？

PM2 是 Node.js 应用的生产级进程管理器，提供：
- ✅ 进程守护（自动重启）
- ✅ 负载均衡（cluster 模式）
- ✅ 日志管理
- ✅ 零停机重启
- ✅ 资源监控

## 适用场景

PM2 适合以下场景：
- 单机部署（< 1000 并发用户）
- 快速上线（无需 Docker 知识）
- 资源受限环境（VPS、轻量服务器）

**不适合**：
- 多机集群部署 → 使用 Docker + Kubernetes
- 需要环境隔离 → 使用 Docker Compose

---

## 前置要求

### 系统要求

- **操作系统**：Linux (Ubuntu 20.04+, CentOS 8+) 或 macOS
- **CPU**：2 核心以上
- **内存**：2GB 以上（推荐 4GB）
- **磁盘**：10GB 以上可用空间

### 软件安装

```bash
# 1. 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version  # v18.x.x

# 2. 安装 pnpm
npm install -g pnpm

# 验证
pnpm --version  # 8.x.x

# 3. 安装 PM2
npm install -g pm2

# 验证
pm2 --version  # 5.x.x

# 4. 设置 PM2 开机自启
pm2 startup
# 按照提示执行输出的命令（通常是 sudo 开头）
```

### 数据库准备

```bash
# 安装 PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE USER aiwedding WITH PASSWORD 'your_password';
CREATE DATABASE ai_wedding OWNER aiwedding;
GRANT ALL PRIVILEGES ON DATABASE ai_wedding TO aiwedding;
\q
EOF

# 验证连接
psql "postgresql://aiwedding:your_password@localhost:5432/ai_wedding" -c "SELECT 1;"
```

---

## 快速部署

### 1. 克隆项目

```bash
# 创建应用目录
sudo mkdir -p /var/www
cd /var/www

# 克隆代码
sudo git clone https://github.com/your-username/ai-wedding.git
cd ai-wedding

# 设置权限
sudo chown -R $USER:$USER /var/www/ai-wedding
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**最小配置**：

```bash
# 数据库
DATABASE_URL="postgresql://aiwedding:your_password@localhost:5432/ai_wedding"

# 认证
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://your-domain.com"

# AI 模型
IMAGE_API_KEY="sk-your-api-key"
IMAGE_API_BASE_URL="https://api.openai.com"
IMAGE_API_MODE="images"

# 存储（需要单独部署 MinIO 或使用阿里云 OSS）
STORAGE_PROVIDER="oss"
ALI_OSS_REGION="oss-cn-hangzhou"
ALI_OSS_ACCESS_KEY_ID="your-key-id"
ALI_OSS_ACCESS_KEY_SECRET="your-key-secret"
ALI_OSS_BUCKET="ai-wedding"

# 应用配置
NODE_ENV="production"
PORT=3000
```

完整配置参考 [环境变量配置文档](./environment-vars.md)。

### 3. 执行部署脚本

```bash
# 运行自动化部署脚本
pnpm deploy

# 脚本会自动执行：
# 1. 前置检查（依赖、环境变量）
# 2. 安装依赖
# 3. 生成 Prisma Client
# 4. 备份旧版本
# 5. 构建应用
# 6. 数据库迁移
# 7. 启动 PM2
# 8. 健康检查
```

### 4. 验证部署

```bash
# 查看 PM2 状态
pm2 status

# 预期输出：
# ┌─────┬──────────────┬─────────┬─────────┬─────────┬──────────┐
# │ id  │ name         │ status  │ restart │ uptime  │ memory   │
# ├─────┼──────────────┼─────────┼─────────┼─────────┼──────────┤
# │ 0   │ ai-wedding   │ online  │ 0       │ 10s     │ 150 MB   │
# └─────┴──────────────┴─────────┴─────────┴─────────┴──────────┘

# 查看日志
pm2 logs ai-wedding --lines 50

# 健康检查
curl http://localhost:3000/api/health
# 预期响应：{"status":"ok","timestamp":"..."}
```

---

## PM2 配置详解

### ecosystem.config.js

项目根目录的 `ecosystem.config.js` 文件配置 PM2 行为：

```javascript
module.exports = {
  apps: [{
    name: "ai-wedding",
    script: "node_modules/next/dist/bin/next",
    args: "start",
    cwd: process.env.APP_DIR || __dirname,
    interpreter: "node",
    env: {
      PORT: process.env.PORT || 3000,
      NODE_ENV: "production",
    },
    instances: process.env.PM2_INSTANCES || 1,  // 实例数量
    exec_mode: process.env.PM2_INSTANCES > 1 ? "cluster" : "fork",
    autorestart: true,  // 自动重启
    watch: false,  // 不监听文件变化（生产环境）
    max_memory_restart: process.env.PM2_MAX_MEMORY || "1G",  // 内存限制
    error_file: "logs/pm2-error.log",
    out_file: "logs/pm2-out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    exp_backoff_restart_delay: 100,  // 指数退避重启
  }]
};
```

### Cluster 模式（多核 CPU）

如果服务器有多核 CPU，可以启用 cluster 模式：

```bash
# 设置实例数量（推荐 CPU 核心数 - 1）
export PM2_INSTANCES=3

# 重新部署
pnpm deploy
```

或直接修改 `ecosystem.config.js`：

```javascript
instances: 4,  // 固定 4 个实例
exec_mode: "cluster",
```

---

## 日常运维

### 查看状态

```bash
# 查看所有进程
pm2 status

# 查看详细信息
pm2 describe ai-wedding

# 实时监控（CPU、内存）
pm2 monit
```

### 查看日志

```bash
# 实时日志
pm2 logs ai-wedding

# 查看最近 100 行
pm2 logs ai-wedding --lines 100

# 只看错误日志
pm2 logs ai-wedding --err

# 清空日志
pm2 flush
```

### 重启应用

```bash
# 普通重启（有短暂停机）
pm2 restart ai-wedding

# 零停机重启（cluster 模式）
pm2 reload ai-wedding

# 停止应用
pm2 stop ai-wedding

# 启动应用
pm2 start ai-wedding
```

### 更新应用

```bash
# 拉取最新代码
cd /var/www/ai-wedding
git pull origin main

# 重新部署（自动备份 + 回滚）
pnpm deploy
```

---

## 生产环境优化

### 1. 配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/ai-wedding
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 反向代理到 PM2
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/ai-wedding /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. 配置 SSL 证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 日志轮转

```bash
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 4. 监控告警

```bash
# 安装 PM2 Plus（可选，提供 Web 监控）
pm2 link your-secret-key your-public-key

# 或使用开源监控工具
# - Prometheus + Grafana
# - Netdata
# - Glances
```

---

## 备份和恢复

### 数据库备份

```bash
# 创建备份脚本
cat > /var/www/ai-wedding/scripts/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/ai-wedding"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/db_$DATE.sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /var/www/ai-wedding/scripts/backup-db.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加：0 2 * * * /var/www/ai-wedding/scripts/backup-db.sh
```

### 恢复数据库

```bash
# 解压备份
gunzip /var/backups/ai-wedding/db_20260305_020000.sql.gz

# 恢复
psql $DATABASE_URL < /var/backups/ai-wedding/db_20260305_020000.sql
```

---

## 故障排查

### 应用无法启动

```bash
# 1. 查看错误日志
pm2 logs ai-wedding --err --lines 100

# 2. 检查端口占用
sudo lsof -i :3000

# 3. 检查环境变量
pm2 env 0  # 0 是进程 ID

# 4. 手动启动测试
cd /var/www/ai-wedding
pnpm start
```

### 内存泄漏

```bash
# 查看内存使用
pm2 monit

# 设置内存限制（超过自动重启）
pm2 restart ai-wedding --max-memory-restart 1G
```

### 数据库连接失败

```bash
# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1;"

# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 查看连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

更多问题参考 [故障排查文档](./troubleshooting.md)。

---

## PM2 vs Docker 对比

| 特性 | PM2 | Docker |
|------|-----|--------|
| 部署复杂度 | ⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| 环境隔离 | ❌ 无 | ✅ 完全隔离 |
| 资源占用 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 |
| 可移植性 | ⭐⭐ 依赖系统 | ⭐⭐⭐⭐⭐ 高 |
| 扩展性 | ⭐⭐ 单机 | ⭐⭐⭐⭐ 集群 |
| 学习曲线 | ⭐⭐ 平缓 | ⭐⭐⭐⭐ 陡峭 |

**建议**：
- 快速上线、单机部署 → PM2
- 生产环境、需要扩展 → Docker

---

## 下一步

- 📖 [配置 Nginx 反向代理](./nginx-config.md)
- 📊 [设置监控和日志](./monitoring.md)
- 🔒 [配置 SSL 证书](./ssl-setup.md)
- 🚀 [迁移到 Docker](./production-docker.md)

---

## 获取帮助

- 🐛 [提交 Issue](https://github.com/your-username/ai-wedding/issues)
- 💬 [讨论区](https://github.com/your-username/ai-wedding/discussions)
- 📧 联系技术支持
