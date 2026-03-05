#!/usr/bin/env bash
# ============================================================
# AI Wedding - Docker 一键部署脚本 (macOS / Linux)
# ============================================================
# 用法:
#   bash deploy.sh              # 自动部署（已配置则直接启动，未配置则交互式配置）
#   bash deploy.sh init         # 强制进入交互式配置
#   bash deploy.sh up           # 启动服务
#   bash deploy.sh down         # 停止服务
#   bash deploy.sh restart      # 重启服务
#   bash deploy.sh rebuild      # 重新构建并启动
#   bash deploy.sh logs         # 查看日志
#   bash deploy.sh logs app     # 查看应用日志
#   bash deploy.sh status       # 查看状态
#   bash deploy.sh backup       # 备份数据库
#   bash deploy.sh restore      # 恢复数据库
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

header() {
  echo ""
  echo -e "${CYAN}=============================================="
  echo "  AI Wedding - Docker Deploy"
  echo -e "==============================================${NC}"
  echo ""
}

# 跨平台 sed -i 兼容 (macOS / Linux)
sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# ============================================================
# 前置检查
# ============================================================
check_prerequisites() {
  info "Checking prerequisites..."

  if ! command -v docker &>/dev/null; then
    err "Docker is not installed. Please install Docker first."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "  https://docs.docker.com/desktop/install/mac-install/"
    else
      echo "  https://docs.docker.com/engine/install/"
    fi
    exit 1
  fi

  if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif docker-compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    err "Docker Compose is not installed."
    echo "  https://docs.docker.com/compose/install/"
    exit 1
  fi

  if ! docker info &>/dev/null 2>&1; then
    err "Docker daemon is not running. Please start Docker."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      echo "  Open Docker Desktop from Applications."
    else
      echo "  Try: sudo systemctl start docker"
    fi
    exit 1
  fi

  ok "Docker ($( docker --version | awk '{print $3}' | tr -d ',' )) and Docker Compose are ready"
}

# ============================================================
# 环境检测 - 判断 .env 是否已正确配置
# ============================================================
is_env_configured() {
  [ -f .env ] || return 1
  local api_key secret admin_pass
  api_key=$(get_env_value "IMAGE_API_KEY" "")
  secret=$(get_env_value "NEXTAUTH_SECRET" "")
  admin_pass=$(get_env_value "ADMIN_PASSWORD" "")
  [ "$api_key" != "sk-your-api-key-here" ] && [ -n "$api_key" ] \
    && [ "$secret" != "please-change-this-secret-in-production" ] && [ -n "$secret" ] \
    && [ "$admin_pass" != "change-me-please" ] && [ -n "$admin_pass" ]
}

ensure_nextauth_secret() {
  local secret
  secret=$(get_env_value "NEXTAUTH_SECRET" "")
  if [ "$secret" = "please-change-this-secret-in-production" ] || [ -z "$secret" ]; then
    local new_secret
    new_secret=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed_inplace "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=${new_secret}|" .env
    ok "Generated NEXTAUTH_SECRET automatically"
  fi
}

# ============================================================
# 自动部署 - 检测 .env 是否已配置，已配置则跳过交互直接部署
# ============================================================
ensure_env() {
  if is_env_configured; then
    ok ".env is configured, skipping interactive setup"
    ensure_nextauth_secret
    return
  fi
  warn ".env is not configured or using default values, entering interactive setup..."
  echo ""
  setup_env
}

# ============================================================
# 环境配置 - 交互式配置 .env 文件
# ============================================================
setup_env() {
  if [ ! -f env.docker.example ]; then
    err "env.docker.example not found"
    exit 1
  fi

  if [ -f .env ]; then
    warn ".env file already exists"
    read -rp "  Reset from template? (y/N): " overwrite
    if [ "$overwrite" = "y" ] || [ "$overwrite" = "Y" ]; then
      cp env.docker.example .env
      ok "Reset .env from template"
    else
      info "Modifying existing .env file"
    fi
  else
    cp env.docker.example .env
    ok "Created .env from template"
  fi

  echo ""
  info "Please configure the following settings (press Enter to keep current value):"
  echo ""

  # AI API Key
  local current_key
  current_key=$(get_env_value "IMAGE_API_KEY" "")
  if [ -n "$current_key" ] && [ "$current_key" != "sk-your-api-key-here" ]; then
    local masked_key="${current_key:0:8}***"
    read -rp "  AI API Key (IMAGE_API_KEY) [$masked_key]: " api_key
    if [ -n "$api_key" ] && [ "$api_key" != "$masked_key" ]; then
      sed_inplace "s|IMAGE_API_KEY=.*|IMAGE_API_KEY=${api_key}|" .env
    fi
  else
    read -rp "  AI API Key (IMAGE_API_KEY): " api_key
    if [ -n "$api_key" ]; then
      sed_inplace "s|IMAGE_API_KEY=.*|IMAGE_API_KEY=${api_key}|" .env
    fi
  fi

  # AI API Base URL
  echo ""
  echo "  API Provider options:"
  echo "    1) OpenAI       (https://api.openai.com)"
  echo "    2) OpenRouter   (https://openrouter.ai/api/v1)"
  echo "    3) 302.ai       (https://api.302.ai)"
  echo "    4) Custom URL"
  read -rp "  Select (1-4) [1]: " api_choice
  case "$api_choice" in
    2) api_base="https://openrouter.ai/api/v1" ;;
    3) api_base="https://api.302.ai" ;;
    4) read -rp "  Enter custom API base URL: " api_base ;;
    *) api_base="https://api.openai.com" ;;
  esac
  sed_inplace "s|IMAGE_API_BASE_URL=.*|IMAGE_API_BASE_URL=${api_base}|" .env

  # API Mode
  echo ""
  echo "  API Mode:"
  echo "    1) images - Standard (DALL-E, etc.)"
  echo "    2) chat   - Streaming (Gemini, etc.)"
  read -rp "  Select (1-2) [1]: " mode_choice
  if [ "$mode_choice" = "2" ]; then
    sed_inplace "s|IMAGE_API_MODE=.*|IMAGE_API_MODE=chat|" .env
  fi

  # Admin account
  echo ""
  local current_admin
  current_admin=$(get_env_value "ADMIN_EMAIL" "admin@example.com")
  read -rp "  Admin email [$current_admin]: " admin_email
  if [ -n "$admin_email" ]; then
    sed_inplace "s|ADMIN_EMAIL=.*|ADMIN_EMAIL=${admin_email}|" .env
  fi

  read -rp "  Admin password [change-me-please]: " admin_pass
  if [ -n "$admin_pass" ]; then
    sed_inplace "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${admin_pass}|" .env
  fi

  # NextAuth Secret - always auto-generate
  ensure_nextauth_secret

  # Server URL
  local current_url
  current_url=$(get_env_value "NEXTAUTH_URL" "http://localhost:3000")
  read -rp "  Server URL (NEXTAUTH_URL) [$current_url]: " server_url
  if [ -n "$server_url" ]; then
    sed_inplace "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=${server_url}|" .env
  fi

  # Storage
  echo ""
  echo "  Storage provider:"
  echo "    1) MinIO (self-hosted, recommended for Docker)"
  echo "    2) Aliyun OSS"
  read -rp "  Select (1-2) [1]: " storage_choice
  if [ "$storage_choice" = "2" ]; then
    sed_inplace "s|STORAGE_PROVIDER=.*|STORAGE_PROVIDER=oss|" .env
    echo ""
    read -rp "  ALI_OSS_REGION [oss-cn-beijing]: " oss_region
    read -rp "  ALI_OSS_ACCESS_KEY_ID: " oss_key_id
    read -rp "  ALI_OSS_ACCESS_KEY_SECRET: " oss_key_secret
    read -rp "  ALI_OSS_BUCKET: " oss_bucket

    sed_inplace "s|# ALI_OSS_REGION=oss-cn-beijing|ALI_OSS_REGION=${oss_region:-oss-cn-beijing}|" .env
    sed_inplace "s|# ALI_OSS_ACCESS_KEY_ID=|ALI_OSS_ACCESS_KEY_ID=${oss_key_id}|" .env
    sed_inplace "s|# ALI_OSS_ACCESS_KEY_SECRET=|ALI_OSS_ACCESS_KEY_SECRET=${oss_key_secret}|" .env
    sed_inplace "s|# ALI_OSS_BUCKET=|ALI_OSS_BUCKET=${oss_bucket}|" .env
  fi

  ok "Configuration saved to .env"
}

# ============================================================
# 检测存储模式
# ============================================================
get_storage_provider() {
  if [ -f .env ]; then
    grep -E "^STORAGE_PROVIDER=" .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" || echo "minio"
  else
    echo "minio"
  fi
}

get_compose_profiles() {
  local provider
  provider=$(get_storage_provider)
  if [ "$provider" = "minio" ]; then
    echo "--profile with-minio"
  else
    echo ""
  fi
}

get_env_value() {
  local key="$1" default="$2"
  if [ -f .env ]; then
    local val
    val=$(grep -E "^${key}=" .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
    if [ -n "$val" ]; then
      echo "$val"
      return
    fi
  fi
  echo "$default"
}

# ============================================================
# 服务管理
# ============================================================
do_up() {
  local profiles
  profiles=$(get_compose_profiles)

  info "Starting services..."
  $COMPOSE_CMD $profiles up -d --build

  echo ""
  ok "Services started successfully!"
  echo ""
  do_status_urls
}

do_down() {
  local profiles
  profiles=$(get_compose_profiles)

  info "Stopping services..."
  $COMPOSE_CMD $profiles down
  ok "Services stopped"
}

do_restart() {
  local profiles
  profiles=$(get_compose_profiles)

  info "Restarting services..."
  $COMPOSE_CMD $profiles restart
  ok "Services restarted"
}

do_rebuild() {
  local profiles
  profiles=$(get_compose_profiles)

  info "Rebuilding and starting services..."
  $COMPOSE_CMD $profiles up -d --build --force-recreate
  ok "Services rebuilt and started"
  echo ""
  do_status_urls
}

do_logs() {
  local profiles
  profiles=$(get_compose_profiles)

  local service="${1:-}"
  if [ -n "$service" ]; then
    $COMPOSE_CMD $profiles logs -f "$service"
  else
    $COMPOSE_CMD $profiles logs -f
  fi
}

do_status() {
  local profiles
  profiles=$(get_compose_profiles)

  $COMPOSE_CMD $profiles ps
  echo ""
  do_status_urls
}

do_status_urls() {
  local app_port
  app_port=$(get_env_value "APP_PORT" "3000")

  local provider
  provider=$(get_storage_provider)

  echo -e "${CYAN}  Access URLs:${NC}"
  echo -e "    App:      http://localhost:${app_port}"
  echo -e "    Health:   http://localhost:${app_port}/api/health"
  if [ "$provider" = "minio" ]; then
    local minio_console
    minio_console=$(get_env_value "MINIO_CONSOLE_PORT" "9001")
    echo -e "    MinIO:    http://localhost:${minio_console}"
  fi
  echo ""
}

# ============================================================
# 数据库备份与恢复
# ============================================================
do_backup() {
  local backup_dir="backups"
  mkdir -p "$backup_dir"

  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${backup_dir}/ai_wedding_${timestamp}.sql.gz"

  local db_user db_name
  db_user=$(get_env_value "POSTGRES_USER" "aiwedding")
  db_name=$(get_env_value "POSTGRES_DB" "ai_wedding")

  info "Backing up database to ${backup_file}..."
  docker exec ai-wedding-db pg_dump -U "$db_user" "$db_name" | gzip > "$backup_file"

  local size
  size=$(du -h "$backup_file" | cut -f1)
  ok "Backup completed: ${backup_file} (${size})"
}

do_restore() {
  local backup_dir="backups"

  if [ ! -d "$backup_dir" ] || [ -z "$(ls -A "$backup_dir" 2>/dev/null)" ]; then
    err "No backups found in ${backup_dir}/"
    exit 1
  fi

  echo ""
  info "Available backups:"
  ls -1t "$backup_dir"/*.sql.gz 2>/dev/null | head -10 | nl
  echo ""

  read -rp "  Enter backup number or filename: " backup_input

  if [[ "$backup_input" =~ ^[0-9]+$ ]]; then
    local backup_file
    backup_file=$(ls -1t "$backup_dir"/*.sql.gz 2>/dev/null | sed -n "${backup_input}p")
  else
    local backup_file="$backup_input"
    if [ ! -f "$backup_file" ] && [ -f "${backup_dir}/${backup_file}" ]; then
      backup_file="${backup_dir}/${backup_file}"
    fi
  fi

  if [ ! -f "$backup_file" ]; then
    err "Backup file not found"
    exit 1
  fi

  local db_user db_name
  db_user=$(get_env_value "POSTGRES_USER" "aiwedding")
  db_name=$(get_env_value "POSTGRES_DB" "ai_wedding")

  warn "This will overwrite the current database!"
  read -rp "  Continue? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    info "Restore cancelled"
    return
  fi

  info "Restoring from ${backup_file}..."
  gunzip -c "$backup_file" | docker exec -i ai-wedding-db psql -U "$db_user" "$db_name"
  ok "Database restored"
}

# ============================================================
# 主入口
# ============================================================
main() {
  header
  check_prerequisites

  case "${1:-}" in
    up)       do_up ;;
    down)     do_down ;;
    restart)  do_restart ;;
    rebuild)  do_rebuild ;;
    logs)     do_logs "${2:-}" ;;
    status)   do_status ;;
    backup)   do_backup ;;
    restore)  do_restore ;;
    init)
      setup_env
      ok "Configuration complete. Run 'bash deploy.sh' to deploy."
      ;;
    "")
      ensure_env
      echo ""
      info "Starting deployment..."
      echo ""
      do_up

      echo ""
      echo -e "${GREEN}=============================================="
      echo "  Deployment completed!"
      echo -e "==============================================${NC}"
      echo ""
      echo "  Common commands:"
      echo "    bash deploy.sh status    - Check status"
      echo "    bash deploy.sh logs      - View logs"
      echo "    bash deploy.sh logs app  - View app logs"
      echo "    bash deploy.sh restart   - Restart services"
      echo "    bash deploy.sh rebuild   - Rebuild & restart"
      echo "    bash deploy.sh down      - Stop services"
      echo "    bash deploy.sh backup    - Backup database"
      echo "    bash deploy.sh restore   - Restore database"
      echo ""
      ;;
    *)
      echo "Usage: bash deploy.sh [command]"
      echo ""
      echo "Commands:"
      echo "  (none)     Auto deploy (skip setup if .env is configured)"
      echo "  init       Force interactive setup (reconfigure .env)"
      echo "  up         Start services"
      echo "  down       Stop services"
      echo "  restart    Restart services"
      echo "  rebuild    Rebuild & restart"
      echo "  logs       View all logs"
      echo "  logs app   View app logs only"
      echo "  status     Show service status"
      echo "  backup     Backup database"
      echo "  restore    Restore database"
      exit 1
      ;;
  esac
}

main "$@"
