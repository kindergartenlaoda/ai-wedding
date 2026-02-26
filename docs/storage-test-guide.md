# 🧪 存储切换功能快速测试指南

## 测试前准备

### 1. 确认应用状态
```bash
pnpm pm2:status
```
预期输出：`status: online`

### 2. 确认存储配置
```bash
pnpm test:storage
```
预期输出：`实际使用的提供商: oss`

## 测试场景

### 场景 1：阿里云 OSS 上传测试

#### 步骤
1. 访问 http://localhost:3000
2. 登录账号
3. 进入创建页面
4. 上传一张测试图片
5. 查看上传结果

#### 验证点
- [ ] 上传成功
- [ ] 返回的 URL 格式：`https://ai-weddings.oss-cn-beijing.aliyuncs.com/...`
- [ ] 图片可以正常访问
- [ ] 生成了缩略图（thumbnailUrl 和 mediumUrl）
- [ ] 缩略图是 WebP 格式

#### 查看日志
```bash
pnpm pm2:logs | grep "图片上传成功"
```

预期输出示例：
```
✅ 图片上传成功: uploads/1709012345678-abc123.jpg (1234.5KB)
✅ 缩略图生成完成: uploads/1709012345678-abc123_thumb.webp (400px, 123.4KB)
✅ 缩略图生成完成: uploads/1709012345678-abc123_medium.webp (800px, 234.5KB)
```

---

### 场景 2：切换到 MinIO 测试

#### 步骤
```bash
# 1. 修改配置
sed -i '' 's/STORAGE_PROVIDER=oss/STORAGE_PROVIDER=minio/' .env

# 2. 重启应用
pnpm pm2:restart

# 3. 等待启动
sleep 5

# 4. 验证配置
pnpm test:storage
```

预期输出：`实际使用的提供商: minio`

#### 上传测试
1. 访问 http://localhost:3000
2. 上传测试图片
3. 查看 URL 格式

#### 验证点
- [ ] 上传成功
- [ ] 返回的 URL 格式：`http://123.57.16.107:9000/ai-images/...`
- [ ] 图片可以正常访问
- [ ] 生成了缩略图

---

### 场景 3：切换回 OSS

#### 步骤
```bash
# 1. 修改配置
sed -i '' 's/STORAGE_PROVIDER=minio/STORAGE_PROVIDER=oss/' .env

# 2. 重启应用
pnpm pm2:restart

# 3. 验证配置
pnpm test:storage
```

预期输出：`实际使用的提供商: oss`

---

### 场景 4：性能对比测试

#### 测试方法
1. 准备 5 张测试图片（每张约 2-5MB）
2. 使用 OSS 上传，记录时间
3. 切换到 MinIO，上传相同图片，记录时间
4. 对比上传速度

#### 记录表格
| 存储提供商 | 图片 1 | 图片 2 | 图片 3 | 图片 4 | 图片 5 | 平均时间 |
|-----------|--------|--------|--------|--------|--------|----------|
| OSS       |        |        |        |        |        |          |
| MinIO     |        |        |        |        |        |          |

---

### 场景 5：并发上传测试

#### 测试方法
1. 同时上传多张图片（3-5张）
2. 观察是否都能成功上传
3. 检查是否有错误日志

#### 验证点
- [ ] 所有图片都上传成功
- [ ] 没有并发冲突错误
- [ ] 缩略图都正确生成

---

## 故障排查

### 问题 1：上传失败

#### 检查步骤
```bash
# 1. 查看错误日志
pnpm pm2:logs --err

# 2. 检查存储配置
pnpm test:storage

# 3. 检查环境变量
cat .env | grep STORAGE_PROVIDER
cat .env | grep ALI_OSS_
cat .env | grep MINIO_
```

#### 常见原因
- 环境变量未正确配置
- 存储服务不可访问
- 权限配置错误
- 网络连接问题

---

### 问题 2：图片 URL 无法访问

#### OSS 问题
- 检查 bucket 权限设置
- 确认 bucket 是公共读
- 验证 AccessKey 权限

#### MinIO 问题
```bash
# 修复 bucket 策略
pnpm fix-minio:policy

# 刷新图片 URL
pnpm fix-minio:urls
```

---

### 问题 3：缩略图未生成

#### 检查日志
```bash
pnpm pm2:logs | grep "缩略图"
```

#### 可能原因
- sharp 库未正确安装
- 图片格式不支持
- 内存不足

#### 解决方法
```bash
# 重新安装 sharp
pnpm install sharp --force

# 重启应用
pnpm pm2:restart
```

---

## 监控命令

### 实时监控
```bash
# 查看实时日志
pnpm pm2:logs

# 只看上传相关
pnpm pm2:logs | grep "上传"

# 只看错误
pnpm pm2:logs --err
```

### 应用状态
```bash
# 查看状态
pnpm pm2:status

# 查看详细信息
pm2 show ai-wedding
```

### 存储配置
```bash
# 验证当前配置
pnpm test:storage

# 查看环境变量
cat .env | grep STORAGE
```

---

## 测试清单

### 基础功能
- [ ] OSS 上传成功
- [ ] MinIO 上传成功
- [ ] 切换存储提供商成功
- [ ] 缩略图生成成功
- [ ] 图片可以正常访问

### 性能测试
- [ ] 单张图片上传速度
- [ ] 多张图片并发上传
- [ ] 大文件上传（>10MB）
- [ ] 小文件上传（<1MB）

### 稳定性测试
- [ ] 连续上传 10 张图片
- [ ] 切换存储后立即上传
- [ ] 应用重启后上传
- [ ] 长时间运行后上传

### 边界测试
- [ ] 上传非图片文件
- [ ] 上传超大文件
- [ ] 上传损坏的图片
- [ ] 网络中断时上传

---

## 快速命令参考

```bash
# 查看状态
pnpm pm2:status

# 查看日志
pnpm pm2:logs

# 重启应用
pnpm pm2:restart

# 验证配置
pnpm test:storage

# 切换到 OSS
sed -i '' 's/STORAGE_PROVIDER=minio/STORAGE_PROVIDER=oss/' .env && pnpm pm2:restart

# 切换到 MinIO
sed -i '' 's/STORAGE_PROVIDER=oss/STORAGE_PROVIDER=minio/' .env && pnpm pm2:restart

# 修复 MinIO
pnpm fix-minio:policy

# 查看错误
pnpm pm2:logs --err

# 停止应用
pnpm pm2:stop

# 启动应用
pnpm pm2:start
```
