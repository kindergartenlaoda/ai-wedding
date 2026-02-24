#!/bin/bash
# =============================================================
# generate-single API 诊断测试脚本
# 用途：逐层排查 /api/generate-single 接口失败原因
# =============================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
# 从命令行参数或环境变量获取 session token
SESSION_TOKEN="${SESSION_TOKEN:-}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }
log_sep()   { echo -e "${CYAN}─────────────────────────────────────────────────${NC}"; }

# 帮助信息
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -t, --token TOKEN     NextAuth session token (required)"
  echo "  -u, --url URL         Base URL (default: http://localhost:3000)"
  echo "  -h, --help            Show this help"
  echo ""
  echo "Example:"
  echo "  $0 -t 'eyJhbGciOi...'"
  echo "  SESSION_TOKEN='eyJhbGciOi...' $0"
  exit 0
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--token) SESSION_TOKEN="$2"; shift 2 ;;
    -u|--url)   BASE_URL="$2"; shift 2 ;;
    -h|--help)  usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$SESSION_TOKEN" ]]; then
  log_fail "Missing session token. Use -t or set SESSION_TOKEN env var."
  usage
fi

COOKIE="next-auth.session-token=${SESSION_TOKEN}"
TMPDIR_TEST=$(mktemp -d)
trap "rm -rf $TMPDIR_TEST" EXIT

echo ""
echo "=========================================="
echo " generate-single API Diagnostic Test"
echo "=========================================="
echo " Base URL: $BASE_URL"
echo " Token:    ${SESSION_TOKEN:0:20}..."
echo ""

# =============================================================
# TEST 1: 服务是否可达
# =============================================================
log_sep
log_info "TEST 1: 检查服务是否可达"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "000" ]]; then
  log_fail "服务不可达: $BASE_URL"
  exit 1
elif [[ "$HTTP_CODE" =~ ^[23] ]]; then
  log_ok "服务可达 (HTTP $HTTP_CODE)"
else
  log_warn "服务返回异常状态: HTTP $HTTP_CODE"
fi

# =============================================================
# TEST 2: Session 是否有效
# =============================================================
log_sep
log_info "TEST 2: 检查 Session 是否有效"

PROFILE_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Cookie: $COOKIE" \
  "$BASE_URL/api/profile" 2>/dev/null)

PROFILE_HTTP=$(echo "$PROFILE_RESP" | tail -1)
PROFILE_BODY=$(echo "$PROFILE_RESP" | sed '$d')

if [[ "$PROFILE_HTTP" == "200" ]]; then
  USER_EMAIL=$(echo "$PROFILE_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email','unknown'))" 2>/dev/null || echo "parse-error")
  USER_CREDITS=$(echo "$PROFILE_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('credits','unknown'))" 2>/dev/null || echo "parse-error")
  log_ok "Session 有效 - 用户: $USER_EMAIL, 积分: $USER_CREDITS"

  if [[ "$USER_CREDITS" != "parse-error" ]] && [[ "$USER_CREDITS" -lt 15 ]] 2>/dev/null; then
    log_warn "积分不足! 当前 $USER_CREDITS, 需要 15"
  fi
else
  log_fail "Session 无效 (HTTP $PROFILE_HTTP)"
  log_fail "响应: $PROFILE_BODY"
  exit 1
fi

# =============================================================
# TEST 3: 检查当前激活的模型配置
# =============================================================
log_sep
log_info "TEST 3: 检查当前激活的模型配置"

MODEL_RESP=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/model-configs/active" 2>/dev/null)

MODEL_HTTP=$(echo "$MODEL_RESP" | tail -1)
MODEL_BODY=$(echo "$MODEL_RESP" | sed '$d')

if [[ "$MODEL_HTTP" == "200" ]]; then
  log_ok "模型配置接口可用"
  # 解析并展示所有激活的 generate_image 模型
  python3 -c "
import sys, json
try:
    data = json.loads('''$MODEL_BODY''')
    configs = data if isinstance(data, list) else data.get('configs', data.get('data', []))
    gen_configs = [c for c in configs if c.get('type') == 'generate_image']
    if not gen_configs:
        print('  [WARN] 没有找到 type=generate_image 的激活配置!')
    for c in gen_configs:
        print(f\"  - [{c.get('source','?')}] {c.get('name','?')}: model={c.get('model_name', c.get('modelName','?'))}, status={c.get('status','?')}\")
        print(f\"    api_base_url={c.get('api_base_url', c.get('apiBaseUrl','?'))}\")
except Exception as e:
    print(f'  解析失败: {e}')
    print(f'  原始数据: {repr(sys.argv[1][:500]) if len(sys.argv) > 1 else \"N/A\"} ')
" 2>/dev/null || echo "  (解析失败，原始: ${MODEL_BODY:0:300})"
else
  log_warn "模型配置接口不可用 (HTTP $MODEL_HTTP)"
fi

# =============================================================
# TEST 4: 检查可用的模型源
# =============================================================
log_sep
log_info "TEST 4: 检查可用的模型源"

SOURCES_RESP=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/api/model-sources/available" 2>/dev/null)

SOURCES_HTTP=$(echo "$SOURCES_RESP" | tail -1)
SOURCES_BODY=$(echo "$SOURCES_RESP" | sed '$d')

if [[ "$SOURCES_HTTP" == "200" ]]; then
  log_ok "模型源接口可用: $SOURCES_BODY"
else
  log_warn "模型源接口不可用 (HTTP $SOURCES_HTTP)"
fi

# =============================================================
# TEST 5: 发送最简请求（无图片）测试基本流程
# =============================================================
log_sep
log_info "TEST 5: 发送最简请求（纯文本 prompt，无图片）"

SIMPLE_REQ='{"prompt":"Generate a beautiful sunset over the ocean","model":"gemini-2.5-flash-image","source":"openAi","temperature":0.2,"top_p":0.7}'

log_info "请求体: $SIMPLE_REQ"

SIMPLE_RESP_FILE="$TMPDIR_TEST/simple_resp.txt"
SIMPLE_HTTP=$(curl -s -o "$SIMPLE_RESP_FILE" -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d "$SIMPLE_REQ" \
  "$BASE_URL/api/generate-single" 2>/dev/null)

SIMPLE_BODY=$(cat "$SIMPLE_RESP_FILE" 2>/dev/null | head -c 2000)

if [[ "$SIMPLE_HTTP" =~ ^2 ]]; then
  log_ok "请求成功 (HTTP $SIMPLE_HTTP)"
  # 检查是否是 SSE 流
  FIRST_LINE=$(head -1 "$SIMPLE_RESP_FILE" 2>/dev/null)
  if [[ "$FIRST_LINE" == data:* ]]; then
    log_info "响应格式: SSE 流式"
    # 提取前几个 SSE 事件查看模型信息
    EVENTS=$(head -10 "$SIMPLE_RESP_FILE" 2>/dev/null)
    # 提取模型名称
    MODEL_USED=$(echo "$EVENTS" | grep -o '"model":"[^"]*"' | head -1 || echo "unknown")
    log_info "使用的模型: $MODEL_USED"

    # 检查是否包含图片数据
    HAS_IMAGE=false
    if grep -q 'data:image/' "$SIMPLE_RESP_FILE" 2>/dev/null; then
      HAS_IMAGE=true
      log_ok "响应包含 base64 图片数据"
    elif grep -q '!\[image\]' "$SIMPLE_RESP_FILE" 2>/dev/null; then
      HAS_IMAGE=true
      log_ok "响应包含 Markdown 图片"
    elif grep -q '"url"' "$SIMPLE_RESP_FILE" 2>/dev/null; then
      log_info "响应可能包含 URL 格式图片"
    fi

    if [[ "$HAS_IMAGE" == false ]]; then
      log_warn "响应中没有检测到图片数据"
      # 提取所有文本内容
      log_info "响应文本内容（前 500 字符）:"
      python3 -c "
import json, sys
content = ''
with open('$SIMPLE_RESP_FILE') as f:
    for line in f:
        line = line.strip()
        if line.startswith('data: ') and line != 'data: [DONE]':
            try:
                d = json.loads(line[6:])
                c = d.get('choices',[{}])[0].get('delta',{}).get('content','')
                if c:
                    content += c
            except: pass
print(content[:500])
" 2>/dev/null || echo "(解析失败)"
    fi

    # 统计 SSE 事件数
    EVENT_COUNT=$(grep -c '^data:' "$SIMPLE_RESP_FILE" 2>/dev/null || echo "0")
    HAS_DONE=$(grep -c '\[DONE\]' "$SIMPLE_RESP_FILE" 2>/dev/null || echo "0")
    log_info "SSE 事件数: $EVENT_COUNT, [DONE]: $HAS_DONE"
  else
    log_info "响应格式: JSON"
    log_info "响应内容: ${SIMPLE_BODY:0:500}"
  fi
else
  log_fail "请求失败 (HTTP $SIMPLE_HTTP)"
  log_fail "错误响应: ${SIMPLE_BODY:0:500}"

  # 解析具体错误
  python3 -c "
import json
try:
    d = json.loads('''${SIMPLE_BODY}''')
    if 'error' in d:
        print(f'  错误信息: {d[\"error\"]}')
    if 'current_credits' in d:
        print(f'  当前积分: {d[\"current_credits\"]}')
    if 'required_credits' in d:
        print(f'  需要积分: {d[\"required_credits\"]}')
except: pass
" 2>/dev/null
fi

# =============================================================
# TEST 6: 带图片的完整请求
# =============================================================
log_sep
log_info "TEST 6: 发送带图片 URL 的完整请求"

# 使用一个简单的测试图片 URL
FULL_REQ=$(cat <<'JSONEOF'
{
  "prompt": "Please edit the provided original image: add a soft warm light effect",
  "image_inputs": ["https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=400"],
  "model": "gemini-2.5-flash-image",
  "source": "openAi",
  "temperature": 0.2,
  "top_p": 0.7
}
JSONEOF
)

log_info "请求体: (带 unsplash 测试图片)"

FULL_RESP_FILE="$TMPDIR_TEST/full_resp.txt"
FULL_HTTP=$(curl -s -o "$FULL_RESP_FILE" -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  --max-time 120 \
  -d "$FULL_REQ" \
  "$BASE_URL/api/generate-single" 2>/dev/null)

FULL_BODY=$(cat "$FULL_RESP_FILE" 2>/dev/null | head -c 2000)

if [[ "$FULL_HTTP" =~ ^2 ]]; then
  log_ok "请求成功 (HTTP $FULL_HTTP)"

  # 分析响应
  FIRST_LINE=$(head -1 "$FULL_RESP_FILE" 2>/dev/null)
  if [[ "$FIRST_LINE" == data:* ]]; then
    MODEL_USED=$(grep -o '"model":"[^"]*"' "$FULL_RESP_FILE" | head -1 || echo "unknown")
    log_info "使用的模型: $MODEL_USED"

    # 检查图片
    HAS_IMAGE=false
    if grep -q 'data:image/' "$FULL_RESP_FILE" 2>/dev/null; then
      HAS_IMAGE=true
      log_ok "响应包含 base64 图片数据"
    elif grep -q '!\[image\]' "$FULL_RESP_FILE" 2>/dev/null; then
      HAS_IMAGE=true
      log_ok "响应包含 Markdown 图片"
    fi

    if [[ "$HAS_IMAGE" == false ]]; then
      log_warn "响应中没有图片数据!"
      log_info "响应文本内容:"
      python3 -c "
import json
content = ''
with open('$FULL_RESP_FILE') as f:
    for line in f:
        line = line.strip()
        if line.startswith('data: ') and line != 'data: [DONE]':
            try:
                d = json.loads(line[6:])
                c = d.get('choices',[{}])[0].get('delta',{}).get('content','')
                if c: content += c
            except: pass
print(content[:800])
" 2>/dev/null || echo "(解析失败)"
    fi

    EVENT_COUNT=$(grep -c '^data:' "$FULL_RESP_FILE" 2>/dev/null || echo "0")
    log_info "SSE 事件数: $EVENT_COUNT"
  else
    log_info "响应格式: JSON"
    log_info "响应: ${FULL_BODY:0:500}"
  fi
else
  log_fail "请求失败 (HTTP $FULL_HTTP)"
  log_fail "错误: ${FULL_BODY:0:500}"
fi

# =============================================================
# 总结
# =============================================================
log_sep
echo ""
echo "=========================================="
echo " DIAGNOSTIC SUMMARY"
echo "=========================================="
echo ""
echo "检查以下关键点:"
echo "  1. 模型配置: 数据库中 type=generate_image 的激活记录指向哪个模型？"
echo "     如果是 kimi-k2.5 等纯文本模型，需要改为图片生成模型"
echo "  2. 模型能力: 确认激活的模型支持图片生成（如 gemini-2.5-flash-image）"
echo "  3. 积分余额: 每次调用消耗 15 积分"
echo "  4. API Key: 确认对应的 API Key 有效且有余额"
echo ""
echo "快速修复:"
echo "  - 访问 $BASE_URL/admin/model-configs 管理模型配置"
echo "  - 停用不支持图片生成的模型, 激活正确的模型"
echo ""
