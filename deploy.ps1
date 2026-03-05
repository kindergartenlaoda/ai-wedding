# ============================================================
# AI Wedding - Docker 一键部署脚本 (Windows PowerShell)
# ============================================================
# 用法:
#   .\deploy.ps1              # 交互式部署（首次）
#   .\deploy.ps1 up           # 启动服务
#   .\deploy.ps1 down         # 停止服务
#   .\deploy.ps1 restart      # 重启服务
#   .\deploy.ps1 rebuild      # 重新构建并启动
#   .\deploy.ps1 logs         # 查看日志
#   .\deploy.ps1 logs app     # 查看应用日志
#   .\deploy.ps1 status       # 查看状态
#   .\deploy.ps1 backup       # 备份数据库
#   .\deploy.ps1 restore      # 恢复数据库
# ============================================================

param(
    [Parameter(Position = 0)]
    [string]$Command = "",

    [Parameter(Position = 1)]
    [string]$SubCommand = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ============================================================
# 辅助函数
# ============================================================
function Write-Info    { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Ok      { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Show-Header {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  AI Wedding - Docker Deploy (Windows)"        -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Read-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    if ($Default) {
        $input = Read-Host "$Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($input)) { return $Default }
        return $input
    }
    return Read-Host $Prompt
}

# ============================================================
# Docker Compose 命令检测
# ============================================================
$COMPOSE_CMD = $null

function Find-ComposeCommand {
    try {
        $null = docker compose version 2>$null
        $script:COMPOSE_CMD = "docker compose"
        return
    } catch {}
    try {
        $null = docker-compose version 2>$null
        $script:COMPOSE_CMD = "docker-compose"
        return
    } catch {}
    Write-Err "Docker Compose is not installed."
    Write-Host "  https://docs.docker.com/compose/install/"
    exit 1
}

function Invoke-Compose {
    param([string[]]$Args)
    $allArgs = $Args -join " "
    Invoke-Expression "$script:COMPOSE_CMD $allArgs"
}

# ============================================================
# 前置检查
# ============================================================
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    try {
        $null = Get-Command docker -ErrorAction Stop
    } catch {
        Write-Err "Docker is not installed. Please install Docker Desktop for Windows."
        Write-Host "  https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    }

    Find-ComposeCommand

    try {
        $null = docker info 2>$null
    } catch {
        Write-Err "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    }

    Write-Ok "Docker and Docker Compose are ready"
}

# ============================================================
# 环境配置
# ============================================================
function Set-EnvFile {
    if (Test-Path ".env") {
        Write-Warn ".env file already exists"
        $overwrite = Read-UserInput "  Overwrite with template? (y/N)" "N"
        if ($overwrite -notin @("y", "Y")) {
            Write-Info "Keeping existing .env file"
            return
        }
    }

    if (-not (Test-Path "env.docker.example")) {
        Write-Err "env.docker.example not found"
        exit 1
    }

    Copy-Item "env.docker.example" ".env" -Force
    Write-Ok "Created .env from template"

    Write-Host ""
    Write-Info "Please configure the following required settings:"
    Write-Host ""

    # AI API Key
    $apiKey = Read-UserInput "  AI API Key (IMAGE_API_KEY)"
    if ($apiKey) {
        (Get-Content ".env") -replace "IMAGE_API_KEY=sk-your-api-key-here", "IMAGE_API_KEY=$apiKey" | Set-Content ".env"
    }

    # API Provider
    Write-Host ""
    Write-Host "  API Provider options:"
    Write-Host "    1) OpenAI       (https://api.openai.com)"
    Write-Host "    2) OpenRouter   (https://openrouter.ai/api/v1)"
    Write-Host "    3) 302.ai       (https://api.302.ai)"
    Write-Host "    4) Custom URL"
    $apiChoice = Read-UserInput "  Select (1-4)" "1"
    $apiBase = switch ($apiChoice) {
        "2" { "https://openrouter.ai/api/v1" }
        "3" { "https://api.302.ai" }
        "4" { Read-UserInput "  Enter custom API base URL" }
        default { "https://api.openai.com" }
    }
    (Get-Content ".env") -replace "IMAGE_API_BASE_URL=https://api.openai.com", "IMAGE_API_BASE_URL=$apiBase" | Set-Content ".env"

    # API Mode
    Write-Host ""
    Write-Host "  API Mode:"
    Write-Host "    1) images - Standard (DALL-E, etc.)"
    Write-Host "    2) chat   - Streaming (Gemini, etc.)"
    $modeChoice = Read-UserInput "  Select (1-2)" "1"
    if ($modeChoice -eq "2") {
        (Get-Content ".env") -replace "IMAGE_API_MODE=images", "IMAGE_API_MODE=chat" | Set-Content ".env"
    }

    # Admin account
    Write-Host ""
    $adminEmail = Read-UserInput "  Admin email" "admin@example.com"
    (Get-Content ".env") -replace "ADMIN_EMAIL=admin@example.com", "ADMIN_EMAIL=$adminEmail" | Set-Content ".env"

    $adminPass = Read-UserInput "  Admin password" "change-me-please"
    (Get-Content ".env") -replace "ADMIN_PASSWORD=change-me-please", "ADMIN_PASSWORD=$adminPass" | Set-Content ".env"

    # NextAuth Secret
    Write-Host ""
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    (Get-Content ".env") -replace "NEXTAUTH_SECRET=please-change-this-secret-in-production", "NEXTAUTH_SECRET=$secret" | Set-Content ".env"
    Write-Ok "Generated NEXTAUTH_SECRET automatically"

    # Server URL
    $serverUrl = Read-UserInput "  Server URL (NEXTAUTH_URL)" "http://localhost:3000"
    (Get-Content ".env") -replace "NEXTAUTH_URL=http://localhost:3000", "NEXTAUTH_URL=$serverUrl" | Set-Content ".env"

    # Storage
    Write-Host ""
    Write-Host "  Storage provider:"
    Write-Host "    1) MinIO (self-hosted, recommended for Docker)"
    Write-Host "    2) Aliyun OSS"
    $storageChoice = Read-UserInput "  Select (1-2)" "1"
    if ($storageChoice -eq "2") {
        (Get-Content ".env") -replace "STORAGE_PROVIDER=minio", "STORAGE_PROVIDER=oss" | Set-Content ".env"
        Write-Host ""
        $ossRegion = Read-UserInput "  ALI_OSS_REGION" "oss-cn-beijing"
        $ossKeyId = Read-UserInput "  ALI_OSS_ACCESS_KEY_ID"
        $ossKeySecret = Read-UserInput "  ALI_OSS_ACCESS_KEY_SECRET"
        $ossBucket = Read-UserInput "  ALI_OSS_BUCKET"

        $content = Get-Content ".env"
        $content = $content -replace "# ALI_OSS_REGION=oss-cn-beijing", "ALI_OSS_REGION=$ossRegion"
        $content = $content -replace "# ALI_OSS_ACCESS_KEY_ID=", "ALI_OSS_ACCESS_KEY_ID=$ossKeyId"
        $content = $content -replace "# ALI_OSS_ACCESS_KEY_SECRET=", "ALI_OSS_ACCESS_KEY_SECRET=$ossKeySecret"
        $content = $content -replace "# ALI_OSS_BUCKET=", "ALI_OSS_BUCKET=$ossBucket"
        $content | Set-Content ".env"
    }

    Write-Ok "Configuration saved to .env"
}

# ============================================================
# 检测存储模式
# ============================================================
function Get-StorageProvider {
    if (Test-Path ".env") {
        $line = Select-String -Path ".env" -Pattern "^STORAGE_PROVIDER=" | Select-Object -First 1
        if ($line) {
            return ($line.Line -split "=", 2)[1].Trim('"', "'", " ")
        }
    }
    return "minio"
}

function Get-ComposeProfiles {
    $provider = Get-StorageProvider
    if ($provider -eq "minio") {
        return "--profile with-minio"
    }
    return ""
}

function Get-EnvValue {
    param([string]$Key, [string]$Default)
    if (Test-Path ".env") {
        $line = Select-String -Path ".env" -Pattern "^${Key}=" | Select-Object -First 1
        if ($line) {
            $val = ($line.Line -split "=", 2)[1].Trim('"', "'", " ")
            if ($val) { return $val }
        }
    }
    return $Default
}

# ============================================================
# 服务管理
# ============================================================
function Start-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "Starting services..."
    Invoke-Compose @($profiles, "up", "-d", "--build")
    Write-Host ""
    Write-Ok "Services started successfully!"
    Write-Host ""
    Show-StatusUrls
}

function Stop-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "Stopping services..."
    Invoke-Compose @($profiles, "down")
    Write-Ok "Services stopped"
}

function Restart-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "Restarting services..."
    Invoke-Compose @($profiles, "restart")
    Write-Ok "Services restarted"
}

function Rebuild-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "Rebuilding and starting services..."
    Invoke-Compose @($profiles, "up", "-d", "--build", "--force-recreate")
    Write-Ok "Services rebuilt and started"
    Write-Host ""
    Show-StatusUrls
}

function Show-Logs {
    param([string]$Service = "")
    $profiles = Get-ComposeProfiles
    if ($Service) {
        Invoke-Compose @($profiles, "logs", "-f", $Service)
    } else {
        Invoke-Compose @($profiles, "logs", "-f")
    }
}

function Show-Status {
    $profiles = Get-ComposeProfiles
    Invoke-Compose @($profiles, "ps")
    Write-Host ""
    Show-StatusUrls
}

function Show-StatusUrls {
    $appPort = Get-EnvValue "APP_PORT" "3000"
    $provider = Get-StorageProvider

    Write-Host "  Access URLs:" -ForegroundColor Cyan
    Write-Host "    App:      http://localhost:$appPort"
    Write-Host "    Health:   http://localhost:$appPort/api/health"
    if ($provider -eq "minio") {
        $minioConsole = Get-EnvValue "MINIO_CONSOLE_PORT" "9001"
        Write-Host "    MinIO:    http://localhost:$minioConsole"
    }
    Write-Host ""
}

# ============================================================
# 数据库备份与恢复
# ============================================================
function Backup-Database {
    $backupDir = "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$backupDir\ai_wedding_$timestamp.sql"

    $dbUser = Get-EnvValue "POSTGRES_USER" "aiwedding"
    $dbName = Get-EnvValue "POSTGRES_DB" "ai_wedding"

    Write-Info "Backing up database to $backupFile..."
    docker exec ai-wedding-db pg_dump -U $dbUser $dbName | Out-File -Encoding UTF8 $backupFile

    $size = (Get-Item $backupFile).Length / 1KB
    Write-Ok "Backup completed: $backupFile ($([math]::Round($size, 1)) KB)"
}

function Restore-Database {
    $backupDir = "backups"

    if (-not (Test-Path $backupDir)) {
        Write-Err "No backups directory found"
        exit 1
    }

    $backups = Get-ChildItem "$backupDir\*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10
    if (-not $backups -or $backups.Count -eq 0) {
        Write-Err "No backup files found in $backupDir\"
        exit 1
    }

    Write-Host ""
    Write-Info "Available backups:"
    $i = 1
    foreach ($b in $backups) {
        Write-Host "  $i) $($b.Name)"
        $i++
    }
    Write-Host ""

    $choice = Read-UserInput "  Enter number to restore (1-$($backups.Count))"
    $idx = [int]$choice - 1
    if ($idx -lt 0 -or $idx -ge $backups.Count) {
        Write-Err "Invalid selection"
        exit 1
    }

    $selectedFile = $backups[$idx].FullName
    $dbUser = Get-EnvValue "POSTGRES_USER" "aiwedding"
    $dbName = Get-EnvValue "POSTGRES_DB" "ai_wedding"

    Write-Warn "This will overwrite the current database!"
    $confirm = Read-UserInput "  Continue? (y/N)" "N"
    if ($confirm -notin @("y", "Y")) {
        Write-Info "Restore cancelled"
        return
    }

    Write-Info "Restoring from $($backups[$idx].Name)..."
    Get-Content $selectedFile | docker exec -i ai-wedding-db psql -U $dbUser $dbName
    Write-Ok "Database restored"
}

# ============================================================
# 帮助信息
# ============================================================
function Show-Usage {
    Write-Host "Usage: .\deploy.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  (none)      Interactive setup & deploy"
    Write-Host "  up          Start services"
    Write-Host "  down        Stop services"
    Write-Host "  restart     Restart services"
    Write-Host "  rebuild     Rebuild & restart"
    Write-Host "  logs        View all logs"
    Write-Host "  logs app    View app logs only"
    Write-Host "  status      Show service status"
    Write-Host "  backup      Backup database"
    Write-Host "  restore     Restore database"
}

# ============================================================
# 主入口
# ============================================================
Show-Header
Test-Prerequisites

switch ($Command) {
    "up"      { Start-Services }
    "down"    { Stop-Services }
    "restart" { Restart-Services }
    "rebuild" { Rebuild-Services }
    "logs"    { Show-Logs -Service $SubCommand }
    "status"  { Show-Status }
    "backup"  { Backup-Database }
    "restore" { Restore-Database }
    ""        {
        Set-EnvFile
        Write-Host ""
        Write-Info "Starting deployment..."
        Write-Host ""
        Start-Services
        Write-Host ""
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "  Deployment completed!"                        -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Common commands:"
        Write-Host "    .\deploy.ps1 status    - Check status"
        Write-Host "    .\deploy.ps1 logs      - View logs"
        Write-Host "    .\deploy.ps1 logs app  - View app logs"
        Write-Host "    .\deploy.ps1 restart   - Restart services"
        Write-Host "    .\deploy.ps1 rebuild   - Rebuild & restart"
        Write-Host "    .\deploy.ps1 down      - Stop services"
        Write-Host "    .\deploy.ps1 backup    - Backup database"
        Write-Host "    .\deploy.ps1 restore   - Restore database"
        Write-Host ""
    }
    default   { Show-Usage }
}
