# 故障排查指南

本文档提供 AI Wedding 项目常见问题的诊断和解决方案。

## 快速诊断

### 健康检查清单

```bash
# 1. 检查应用状态
curl http://localhost:3000/api/health

# 2. 检查数据库连接
psql $DATABASE_URL -c "SELECT 1;"

# 3. 检查存储服务
# MinIO
curl http://localhost:9000/minio/health/live

# 4. 查看应用日志
# Docker
docker compose logs app --tail 100

# PM2
pm2 logs ai-wedding --lines 100
```

---

## 常见问题

### 1. 应用无法启动

#### 症状
```
Error: Cannot find module 'next'
或
Error: ENOENT: no such file or directory, open '.next/...'
```

#### 原因
- 依赖未安装
- 构建未完成

#### 解决方案

**Docker**:
```bash
# 重新构建镜像
docker compose build app --no-cache
docker compose up -d app
```

**PM2**:
```bash
# 重新安装依赖和构建
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
pm2 restart ai-wedding
```

---

### 2. 数据库连接失败

#### 症状
```
Error: P1001: Can't reach database server at `localhost:5432`
或
Error: password authentication failed for user "aiwedding"
```

#### 诊断步骤

```bash
# 1. 检查 DATABASE_URL 格式
echo $DATABASE_URL
# 正确格式：postgresql://user:password@host:5432/database

# 2. 测试数据库连接
psql "$DATABASE_URL" -c "SELECT version();"

# 3. 检查 PostgreSQL 是否运行
# Docker
docker compose ps postgres

# 系统服务
sudo systemctl status postgresql
```

#### 解决方案

**连接被拒绝**:
```bash
# Docker: 确保容器在同一网络
docker compose up -d postgres
docker compose logs postgres

# 系统服务: 启动 PostgreSQL
sudo systemctl start postgresql
```

**认证失败**:
```bash
# 重置密码
sudo -u postgres psql <<EOF
ALTER USER aiwedding WITH PASSWORD 'new_password';
EOF

# 更新 .env
DATABASE_URL="postgresql://aiwedding:new_password@localhost:5432/ai_wedding"
```

**数据库不存在**:
```bash
# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE ai_wedding OWNER aiwedding;"

# 执行迁移
pnpm prisma migrate deploy
```

---

### 3. 图片生成失败

#### 症状
```
Error: Request failed with status code 401
或
Error: Insufficient credits
```

#### 诊断步骤

```bash
# 1. 检查 API Key
echo $IMAGE_API_KEY | head -c 10
# 应该显示 sk-xxx 或类似格式

# 2. 测试 API 连接
curl -H "Authorization: Bearer $IMAGE_API_KEY" \
     "$IMAGE_API_BASE_URL/v1/models"

# 3. 检查用户积分
psql $DATABASE_URL -c "SELECT email, credits FROM profiles WHERE email='user@example.com';"
```

#### 解决方案

**API Key 无效**:
```bash
# 更新 .env
IMAGE_API_KEY="sk-your-new-api-key"

# 重启应用
docker compose restart app  # Docker
pm2 restart ai-wedding      # PM2
```

**积分不足**:
```sql
-- 手动添加积分
UPDATE profiles SET credits = credits + 100 WHERE email = 'user@example.com';
```

**API 限流**:
```bash
# 检查速率限制配置
grep RATE_LIMIT .env

# 调整限制（.env）
RATE_LIMIT_PER_HOUR=20
```

---

### 4. 图片上传失败

#### 症状
```
Error: MinIO connection refused
或
Error: Access Denied (403)
```

#### 诊断步骤

```bash
# 1. 检查存储配置
echo $STORAGE_PROVIDER  # minio 或 oss

# MinIO
curl http://localhost:9000/minio/health/live

# 2. 检查 bucket 是否存在
# MinIO
docker exec ai-wedding-minio mc ls local/

# 3. 检查权限
docker exec ai-wedding-minio mc policy get local/ai-images
```

#### 解决方案

**MinIO 未启动**:
```bash
# Docker
docker compose --profile with-minio up -d minio

# 检查状态
docker compose ps minio
```

**Bucket 不存在**:
```bash
# 创建 bucket
docker exec ai-wedding-minio mc mb local/ai-images

# 设置公开读权限
docker exec ai-wedding-minio mc policy set download local/ai-images
```

**403 错误（权限问题）**:
```bash
# 运行修复脚本
bash scripts/fix-minio-403.sh

# 或手动修复
docker exec ai-wedding-minio mc policy set download local/ai-images
```

**阿里云 OSS 配置错误**:
```bash
# 验证配置
cat .env | grep ALI_OSS

# 测试连接（需要安装 ossutil）
ossutil ls oss://$ALI_OSS_BUCKET --config-file ~/.ossutilconfig
```

---

### 5. 数据库迁移失败

#### 症状
```
Error: Migration failed to apply cleanly
或
Error: Unique constraint failed
```

#### 诊断步骤

```bash
# 1. 查看迁移状态
pnpm prisma migrate status

# 2. 查看迁移历史
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
```

#### 解决方案

**迁移冲突**:
```bash
# 标记迁移为已应用（谨慎使用）
pnpm prisma migrate resolve --applied "20260305000000_migration_name"

# 重新尝试
pnpm prisma migrate deploy
```

**数据冲突**:
```bash
# 查看具体错误
pnpm prisma migrate deploy 2>&1 | tee migration-error.log

# 手动修复数据后重试
psql $DATABASE_URL -c "DELETE FROM table WHERE condition;"
pnpm prisma migrate deploy
```

**完全重置（开发环境）**:
```bash
# ⚠️ 警告：会删除所有数据
pnpm prisma migrate reset
```

---

### 6. 内存溢出

#### 症状
```
FATAL ERROR: Reached heap limit Allocation failed
或
PM2: Process killed (out of memory)
```

#### 诊断步骤

```bash
# 1. 查看内存使用
# Docker
docker stats ai-wedding-app

# PM2
pm2 monit

# 2. 查看 Node.js 堆内存
node --max-old-space-size=4096 -e "console.log('OK')"
```

#### 解决方案

**增加内存限制**:

**Docker**:
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

**PM2**:
```javascript
// ecosystem.config.js
max_memory_restart: "2G",
```

**Node.js 堆内存**:
```bash
# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在 ecosystem.config.js
node_args: "--max-old-space-size=4096"
```

**优化代码**:
```bash
# 检查内存泄漏
npm install -g clinic
clinic doctor -- node server.js
```

---

### 7. 端口被占用

#### 症状
```
Error: listen EADDRINUSE: address already in use :::3000
```

#### 诊断步骤

```bash
# 查找占用端口的进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000
```

#### 解决方案

```bash
# 杀死占用进程
kill -9 <PID>

# 或更改应用端口
# .env
PORT=3001

# 重启应用
docker compose up -d app  # Docker
pm2 restart ai-wedding    # PM2
```

---

### 8. SSL 证书问题

#### 症状
```
Error: unable to verify the first certificate
或
NET::ERR_CERT_AUTHORITY_INVALID
```

#### 诊断步骤

```bash
# 检查证书有效期
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# 检查证书链
curl -vI https://your-domain.com
```

#### 解决方案

**证书过期**:
```bash
# 续期 Let's Encrypt 证书
sudo certbot renew

# 重启 Nginx
sudo systemctl reload nginx
```

**自签名证书（开发环境）**:
```bash
# 生成自签名证书
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

---

### 9. 性能问题

#### 症状
- 页面加载缓慢
- API 响应超时
- 数据库查询慢

#### 诊断步骤

```bash
# 1. 查看应用性能
# Docker
docker stats

# PM2
pm2 monit

# 2. 查看数据库慢查询
psql $DATABASE_URL <<EOF
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF

# 3. 查看网络延迟
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

#### 解决方案

**启用缓存**:
```bash
# 安装 Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# 配置应用使用 Redis（需要代码修改）
```

**数据库优化**:
```sql
-- 添加索引
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_templates_domain ON templates(domain);

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM generations WHERE user_id = 'xxx';
```

**启用 CDN**:
- 将静态资源上传到 CDN
- 配置 `next.config.js` 的 `assetPrefix`

---

## 日志分析

### Docker 日志

```bash
# 查看所有服务日志
docker compose logs

# 只看应用日志
docker compose logs app --tail 100 -f

# 导出日志
docker compose logs app > app-logs.txt
```

### PM2 日志

```bash
# 实时日志
pm2 logs ai-wedding

# 错误日志
pm2 logs ai-wedding --err

# 导出日志
pm2 logs ai-wedding --lines 1000 > pm2-logs.txt
```

### 数据库日志

```bash
# PostgreSQL 日志位置
# Ubuntu: /var/log/postgresql/postgresql-14-main.log
# Docker: docker compose logs postgres

# 查看慢查询
sudo tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"
```

---

## 紧急恢复

### 回滚到旧版本

**Docker**:
```bash
# 查看镜像历史
docker images | grep ai-wedding

# 回滚
git checkout tags/v1.0.0
docker compose build app
docker compose up -d app
```

**PM2**:
```bash
# 使用自动备份
cd /var/www/ai-wedding
ls -la .next.backup.*

# 恢复备份
rm -rf .next
mv .next.backup.1234567890 .next
pm2 restart ai-wedding
```

### 数据库恢复

```bash
# 从备份恢复
cat backup-20260305.sql | docker exec -i ai-wedding-db psql -U aiwedding ai_wedding

# 或
psql $DATABASE_URL < backup-20260305.sql
```

---

## 获取帮助

如果以上方案无法解决问题：

1. **查看完整日志**：
   ```bash
   # Docker
   docker compose logs app > full-logs.txt

   # PM2
   pm2 logs ai-wedding --lines 1000 > full-logs.txt
   ```

2. **收集系统信息**：
   ```bash
   # 系统信息
   uname -a
   docker --version
   node --version
   pnpm --version

   # 环境变量（脱敏）
   env | grep -E "DATABASE|IMAGE|STORAGE" | sed 's/=.*/=***/'
   ```

3. **提交 Issue**：
   - [GitHub Issues](https://github.com/your-username/ai-wedding/issues)
   - 附上日志和系统信息
   - 描述复现步骤

4. **社区支持**：
   - [GitHub Discussions](https://github.com/your-username/ai-wedding/discussions)
   - 技术支持邮箱
