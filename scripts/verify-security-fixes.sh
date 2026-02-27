#!/bin/bash

# 安全修复验证脚本
# 用于验证所有修复是否正确实施

set -e

echo "🔍 开始安全修复验证..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "📋 检查 1: 邀请系统身份验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "requireAuth()" app/api/invite/claim/route.ts; then
    check_pass "邀请 API 已添加身份验证"
else
    check_fail "邀请 API 缺少身份验证"
fi

if grep -q "prisma.\$transaction" app/api/invite/claim/route.ts; then
    check_pass "邀请 API 使用事务保护"
else
    check_fail "邀请 API 缺少事务保护"
fi

if ! grep -q "invitee_id.*req.json" app/api/invite/claim/route.ts; then
    check_pass "邀请 API 不再接受客户端 invitee_id"
else
    check_fail "邀请 API 仍从客户端读取 invitee_id"
fi
echo ""

echo "📋 检查 2: Mock 端点环境保护"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "PAYMENT_PROVIDER" app/api/orders/mock/confirm/route.ts; then
    check_pass "Mock 支付端点已添加环境检查"
else
    check_fail "Mock 支付端点缺少环境检查"
fi

if grep -q "PAYMENT_PROVIDER" app/api/subscriptions/route.ts; then
    check_pass "Mock 订阅端点已添加环境检查"
else
    check_fail "Mock 订阅端点缺少环境检查"
fi

if grep -q "status: 501" app/api/orders/mock/confirm/route.ts; then
    check_pass "Mock 端点返回正确的 501 状态码"
else
    check_warn "Mock 端点可能未返回 501 状态码"
fi
echo ""

echo "📋 检查 3: 退款事务完整性"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "prisma.\$transaction" app/api/credits/refund/route.ts; then
    check_pass "退款 API 使用事务保护"
else
    check_fail "退款 API 缺少事务保护"
fi
echo ""

echo "📋 检查 4: 参数验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "app/lib/validation-utils.ts" ]; then
    check_pass "验证工具模块已创建"
else
    check_fail "验证工具模块不存在"
fi

if grep -q "validatePaginationParams" app/api/gallery/route.ts; then
    check_pass "画廊 API 使用参数验证"
else
    check_fail "画廊 API 未使用参数验证"
fi
echo ""

echo "📋 检查 5: 类型系统规范"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if grep -q "export interface Profile" app/types/database.ts; then
    check_pass "Profile 类型已在 database.ts 中定义"
else
    check_fail "Profile 类型未在 database.ts 中定义"
fi

if grep -q "import.*Profile.*from.*@/types/database" app/contexts/AuthContext.tsx; then
    check_pass "AuthContext 导入统一的 Profile 类型"
else
    check_fail "AuthContext 未导入统一的 Profile 类型"
fi

if grep -q "invite_code" app/types/database.ts && ! grep -q "inviteCode" app/types/database.ts; then
    check_pass "Profile 类型使用 snake_case 字段"
else
    check_warn "Profile 类型可能包含 camelCase 字段"
fi
echo ""

echo "📋 检查 6: 生产日志清理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CONSOLE_LOGS=$(grep -n "console.log\|console.error" app/components/ResultsPage.tsx | grep -v "// " | wc -l)
if [ "$CONSOLE_LOGS" -eq 0 ]; then
    check_pass "ResultsPage 已移除 console.log"
else
    check_warn "ResultsPage 仍包含 $CONSOLE_LOGS 个 console 语句"
fi
echo ""

echo "📋 检查 7: 文档完整性"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "SECURITY_FIXES.md" ]; then
    check_pass "安全修复报告已创建"
else
    check_fail "安全修复报告不存在"
fi

if [ -f "docs/SECURITY_FIX_IMPLEMENTATION.md" ]; then
    check_pass "实施指南已创建"
else
    check_fail "实施指南不存在"
fi

if [ -f "docs/SECURITY_FIX_SUMMARY.md" ]; then
    check_pass "修复总结已创建"
else
    check_fail "修复总结不存在"
fi
echo ""

echo "📋 检查 8: TypeScript 类型检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm typecheck > /dev/null 2>&1; then
    check_pass "TypeScript 类型检查通过"
else
    check_fail "TypeScript 类型检查失败"
    echo "   运行 'pnpm typecheck' 查看详细错误"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 验证结果汇总"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有关键检查通过！${NC}"
    echo ""
    echo "📝 下一步:"
    echo "  1. 审查修改: git diff"
    echo "  2. 运行测试: pnpm test (如果有)"
    echo "  3. 提交代码: git add . && git commit"
    echo "  4. 推送代码: git push"
    exit 0
else
    echo -e "${RED}✗ 发现 $FAILED 个问题，请修复后重试${NC}"
    exit 1
fi
