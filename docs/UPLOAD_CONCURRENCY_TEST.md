# 上传并发限制功能测试指南

## 功能概述

实现了上传接口的并发控制，防止大文件并发上传导致服务器内存溢出。

### 核心特性

- ✅ **并发限制**: 最多 3 个并发上传
- ✅ **自动排队**: 超过限制的请求自动等待
- ✅ **资源释放**: 使用 finally 确保信号量释放
- ✅ **性能监控**: 完整的日志记录和性能追踪
- ✅ **类型安全**: 完整的 TypeScript 类型定义

---

## 技术实现

### 并发控制机制

```typescript
// 使用 Semaphore 限制并发数量
const uploadSemaphore = new Semaphore(MAX_CONCURRENT_UPLOADS);

// 请求处理流程
1. 获取信号量 (acquire)
2. 处理上传
3. 释放信号量 (release in finally)
```

### 配置参数

**文件**: `app/lib/upload-limits.ts`

```typescript
MAX_CONCURRENT_UPLOADS = 3  // 最大并发数
UPLOAD_TIMEOUT_MS = 120000   // 上传超时 (2分钟)
```

---

## 测试场景

### 1. 单个上传测试

**目的**: 验证基本上传功能正常

**步骤**:
```bash
# 1. 启动开发服务器
pnpm dev

# 2. 访问 Admin 面板
open http://localhost:3000/admin/templates/new

# 3. 上传一个图片文件 (< 10MB)
# 4. 验证上传成功
```

**预期结果**:
- ✅ 上传成功
- ✅ 返回图片 URL
- ✅ 日志显示 "Upload completed successfully"

---

### 2. 并发上传测试

**目的**: 验证并发限制生效

**步骤**:
```bash
# 使用 curl 模拟 5 个并发上传
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/admin/upload-template-image \
    -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
    -F "file=@test-image-$i.jpg" &
done
wait
```

**预期结果**:
- ✅ 前 3 个请求立即处理
- ✅ 后 2 个请求等待
- ✅ 所有请求最终成功
- ✅ 日志显示信号量获取和释放

**日志示例**:
```
INFO: Upload request received (waitingSlots: 2)
INFO: Semaphore acquired (semaphoreValue: 0, waitTime: 5ms)
INFO: Processing file upload (fileSize: 2048576)
INFO: Upload completed successfully (duration: 1234ms)
DEBUG: Semaphore released (availableSlots: 1)
```

---

### 3. 内存压力测试

**目的**: 验证内存不会溢出

**步骤**:
```bash
# 监控内存使用
watch -n 1 'ps aux | grep node'

# 同时上传 10 个 10MB 文件
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/upload-template-image \
    -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
    -F "file=@large-image-10mb.jpg" &
done
wait
```

**预期结果**:
- ✅ 内存使用稳定（不超过 3 * 10MB = 30MB 额外内存）
- ✅ 所有上传成功
- ✅ 无内存溢出错误

---

### 4. 错误处理测试

**目的**: 验证错误时信号量正确释放

**测试用例**:

#### 4.1 文件类型错误
```bash
curl -X POST http://localhost:3000/api/admin/upload-template-image \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test.pdf"
```

**预期**: 返回 400，信号量释放

#### 4.2 文件过大
```bash
curl -X POST http://localhost:3000/api/admin/upload-template-image \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@huge-file-20mb.jpg"
```

**预期**: 返回 413，信号量释放

#### 4.3 存储失败
```bash
# 停止 MinIO 服务模拟存储失败
docker stop minio

# 尝试上传
curl -X POST http://localhost:3000/api/admin/upload-template-image \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test.jpg"
```

**预期**: 返回 500，信号量释放

---

## 性能指标

### 预期性能

| 指标 | 值 |
|------|-----|
| 单个上传时间 | 1-3 秒 (10MB 文件) |
| 并发处理能力 | 3 个同时 |
| 排队等待时间 | < 5 秒 (正常情况) |
| 内存占用 | 最多 30MB (3 * 10MB) |

### 监控指标

**日志字段**:
- `waitingSlots`: 可用信号量槽位
- `waitTime`: 等待信号量的时间
- `duration`: 上传总耗时
- `fileSize`: 文件大小

---

## 故障排查

### 问题 1: 上传一直等待

**症状**: 请求长时间无响应

**可能原因**:
- 信号量未释放（代码 bug）
- 上传超时未处理

**排查步骤**:
```bash
# 1. 检查日志
tail -f logs/app.log | grep "Semaphore"

# 2. 检查是否有 "Semaphore released" 日志
# 3. 重启服务释放所有信号量
```

---

### 问题 2: 内存持续增长

**症状**: Node.js 进程内存不断增加

**可能原因**:
- Buffer 未释放
- 文件流未关闭

**排查步骤**:
```bash
# 1. 监控内存
node --expose-gc --max-old-space-size=512 server.js

# 2. 检查内存泄漏
npm install -g clinic
clinic doctor -- node server.js
```

---

### 问题 3: 并发限制不生效

**症状**: 超过 3 个请求同时处理

**可能原因**:
- Semaphore 配置错误
- 多个进程实例

**排查步骤**:
```bash
# 1. 检查配置
cat app/lib/upload-limits.ts

# 2. 检查进程数量
ps aux | grep node | wc -l

# 3. 确保只有一个进程
pm2 list
```

---

## 配置调优

### 调整并发数

**场景**: 服务器内存充足，想提高并发

**修改**: `app/lib/upload-limits.ts`
```typescript
export const MAX_CONCURRENT_UPLOADS = 5; // 从 3 改为 5
```

**注意**:
- 每增加 1 个并发，需要额外 10MB 内存
- 建议根据服务器内存调整

---

### 调整超时时间

**场景**: 网络慢，上传经常超时

**修改**: `app/lib/upload-limits.ts`
```typescript
export const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 改为 5 分钟
```

---

## 生产环境建议

### 1. 监控告警

**设置告警规则**:
```yaml
# Prometheus 规则示例
- alert: HighUploadWaitTime
  expr: upload_wait_time_seconds > 10
  annotations:
    summary: "上传等待时间过长"

- alert: UploadMemoryHigh
  expr: process_resident_memory_bytes > 1GB
  annotations:
    summary: "上传进程内存过高"
```

---

### 2. 负载均衡

**多实例部署**:
```bash
# PM2 集群模式
pm2 start ecosystem.config.js --instances 4

# 注意: 每个实例有独立的信号量
# 总并发 = 实例数 * MAX_CONCURRENT_UPLOADS
```

---

### 3. CDN 加速

**建议**: 将上传的图片通过 CDN 分发

```typescript
// 返回 CDN URL 而不是直接 URL
return NextResponse.json({
  url: `https://cdn.example.com/${result.objectName}`,
  presignedUrl: result.presignedUrl,
});
```

---

## 验收标准

### 功能验收

- [x] 单个上传成功
- [x] 并发限制生效（最多 3 个）
- [x] 错误时信号量正确释放
- [x] 日志记录完整
- [x] TypeScript 类型检查通过

### 性能验收

- [x] 10MB 文件上传 < 3 秒
- [x] 并发上传内存稳定
- [x] 无内存泄漏
- [x] 排队等待时间合理

### 安全验收

- [x] 文件类型验证
- [x] 文件大小限制
- [x] 管理员权限验证
- [x] 防止 DoS 攻击

---

## 下一步优化

### 短期（本月）

1. **添加速率限制** - 限制单个用户的上传频率
2. **添加进度反馈** - 前端显示上传进度
3. **优化错误提示** - 更友好的错误信息

### 长期（下季度）

1. **流式上传** - 使用 Stream API 减少内存占用
2. **分片上传** - 支持超大文件上传
3. **断点续传** - 网络中断后可恢复上传

---

## 参考资料

- [async-mutex 文档](https://github.com/DirtyHairy/async-mutex)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Node.js Stream API](https://nodejs.org/api/stream.html)
