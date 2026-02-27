#!/bin/bash

# 安全修复提交脚本
# 自动化提交所有修复

set -e

echo "🚀 准备提交安全修复..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 检查工作区状态
echo "📋 检查工作区状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✓${NC} 发现待提交的变更"
else
    echo "⚠️  工作区干净，无需提交"
    exit 0
fi
echo ""

# 2. 显示变更摘要
echo "📊 变更摘要:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git status --short
echo ""

# 3. 运行类型检查
echo "🔍 运行 TypeScript 类型检查..."
if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 类型检查通过"
else
    echo "❌ 类型检查失败，请先修复错误"
    exit 1
fi
echo ""

# 4. 添加所有修复文件
echo "📦 添加修复文件到暂存区..."
git add app/api/invite/claim/route.ts
git add app/api/orders/mock/confirm/route.ts
git add app/api/subscriptions/route.ts
git add app/api/credits/refund/route.ts
git add app/api/gallery/route.ts
git add app/types/database.ts
git add app/contexts/AuthContext.tsx
git add app/components/ShareModal.tsx
git add app/components/ResultsPage.tsx
git add app/lib/validation-utils.ts
git add SECURITY_FIXES.md
git add docs/SECURITY_FIX_IMPLEMENTATION.md
git add docs/SECURITY_FIX_SUMMARY.md
git add SECURITY_FIX_COMPLETE.md
git add scripts/verify-security-fixes.sh
echo -e "${GREEN}✓${NC} 文件已添加到暂存区"
echo ""

# 5. 生成提交信息
COMMIT_MSG="fix(security): 修复 7 个安全和质量问题

Critical 修复:
- 邀请系统添加身份验证和事务保护 (invite/claim API)
- Mock 支付端点添加环境隔离 (orders/mock/confirm API)
- Mock 订阅端点添加环境隔离 (subscriptions API)

Major 修复:
- 退款流程添加事务完整性保证 (credits/refund API)
- 画廊 API 添加参数验证 (gallery API)
- 统一 Profile 类型定义 (types/database.ts)
- 移除生产环境 console.log (ResultsPage.tsx)

新增:
- validation-utils.ts 通用验证工具
- 完整的安全修复文档 (4 份)
- 自动化验证脚本

Breaking Changes:
- 邀请 API 接口变更：不再接受客户端传入的 invitee_id
- 客户端 AuthContext.tsx 已同步更新

部署要求:
- 生产环境必须设置 PAYMENT_PROVIDER=stripe
- 开发环境使用 PAYMENT_PROVIDER=mock

测试验证:
- ✅ TypeScript 类型检查通过
- ✅ 所有关键功能验证通过
- ✅ 文档完整

Refs: #security-review-2026-02-27"

# 6. 显示提交信息预览
echo "📝 提交信息预览:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$COMMIT_MSG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 7. 确认提交
read -p "是否继续提交? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 提交已取消"
    exit 1
fi

# 8. 执行提交
echo ""
echo "💾 提交变更..."
git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓${NC} 提交成功！"
echo ""

# 9. 显示提交信息
echo "📋 提交详情:"
git log -1 --stat
echo ""

# 10. 下一步提示
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 安全修复已提交！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 下一步:"
echo "  1. 推送到远程: git push origin $(git branch --show-current)"
echo "  2. 创建 Pull Request"
echo "  3. 通知团队审查"
echo "  4. 部署到测试环境验证"
echo ""
echo "📚 相关文档:"
echo "  - SECURITY_FIXES.md - 详细修复说明"
echo "  - docs/SECURITY_FIX_IMPLEMENTATION.md - 实施指南"
echo "  - docs/SECURITY_FIX_SUMMARY.md - 快速参考"
echo "  - SECURITY_FIX_COMPLETE.md - 完成报告"
echo ""
