# ============================================================
# AI Wedding - Docker 一键部署脚本 (Windows PowerShell)
# ============================================================
# 用法:
#   .\deploy.ps1              # 自动部署（已配置则直接启动，未配置则交互式配置）
#   .\deploy.ps1 init         # 强制进入交互式配置
#   .\deploy.ps1 up           # 启动所有服务
#   .\deploy.ps1 down         # 停止所有服务
#   .\deploy.ps1 restart      # 重启所有服务
#   .\deploy.ps1 rebuild      # 重新构建镜像并启动
#   .\deploy.ps1 logs         # 查看所有服务日志
#   .\deploy.ps1 logs app     # 查看应用服务日志
#   .\deploy.ps1 status       # 查看服务运行状态
#   .\deploy.ps1 backup       # 备份数据库到本地
#   .\deploy.ps1 restore      # 从本地备份恢复数据库
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
# 辅助函数 - 用于格式化输出信息
# ============================================================
function Write-Info    { param($msg) Write-Host "[信息] $msg" -ForegroundColor Blue }
function Write-Ok      { param($msg) Write-Host "[成功] $msg" -ForegroundColor Green }
function Write-Warn    { param($msg) Write-Host "[警告] $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "[错误] $msg" -ForegroundColor Red }

function Show-Header {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "  AI Wedding - Docker 部署工具 (Windows)"       -ForegroundColor Cyan
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
# Docker Compose 命令检测 - 自动识别系统中的 Docker Compose 版本
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
    Write-Err "未检测到 Docker Compose 安装。"
    Write-Host "  请访问: https://docs.docker.com/compose/install/"
    exit 1
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    $filtered = $ComposeArgs | Where-Object { $_ -ne "" }
    $cmd = "$script:COMPOSE_CMD $($filtered -join ' ')"
    Write-Host "  > $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
}

# ============================================================
# 前置检查 - 检查 Docker 环境是否就绪
# ============================================================
function Test-Prerequisites {
    Write-Info "正在检查系统环境..."

    try {
        $null = Get-Command docker -ErrorAction Stop
    } catch {
        Write-Err "未安装 Docker。请先安装 Docker Desktop for Windows。"
        Write-Host "  下载地址: https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    }

    Find-ComposeCommand

    try {
        $null = docker info 2>$null
    } catch {
        Write-Err "Docker 服务未运行。请先启动 Docker Desktop。"
        exit 1
    }

    Write-Ok "Docker 和 Docker Compose 已就绪"
}

# ============================================================
# 环境检测 - 判断 .env 是否已正确配置
# ============================================================
function Test-EnvConfigured {
    if (-not (Test-Path ".env")) { return $false }
    $apiKey = Get-EnvValue "IMAGE_API_KEY" ""
    $secret = Get-EnvValue "NEXTAUTH_SECRET" ""
    $adminPass = Get-EnvValue "ADMIN_PASSWORD" ""
    if ($apiKey -eq "sk-your-api-key-here" -or $apiKey -eq "") { return $false }
    if ($secret -eq "please-change-this-secret-in-production" -or $secret -eq "") { return $false }
    if ($adminPass -eq "change-me-please" -or $adminPass -eq "") { return $false }
    return $true
}

function Ensure-NextAuthSecret {
    $secret = Get-EnvValue "NEXTAUTH_SECRET" ""
    if ($secret -eq "please-change-this-secret-in-production" -or $secret -eq "") {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $newSecret = [Convert]::ToBase64String($bytes)
        $content = Get-Content ".env" -Raw
        $content = $content -replace "NEXTAUTH_SECRET=.*", "NEXTAUTH_SECRET=$newSecret"
        [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Ok "已自动生成 NEXTAUTH_SECRET"
    }
}

# ============================================================
# 自动部署 - 检测 .env 是否已配置，已配置则跳过交互直接部署
# ============================================================
function Ensure-EnvFile {
    if (Test-EnvConfigured) {
        Write-Ok ".env 已配置，跳过交互式配置"
        Ensure-NextAuthSecret
        return
    }
    Write-Warn ".env 未配置或使用默认值，进入交互式配置..."
    Write-Host ""
    Set-EnvFile
}

# ============================================================
# 环境配置 - 交互式配置 .env 文件
# ============================================================
function Set-EnvFile {
    if (-not (Test-Path "env.docker.example")) {
        Write-Err "未找到 env.docker.example 模板文件"
        exit 1
    }

    if (Test-Path ".env") {
        Write-Warn ".env 文件已存在"
        $overwrite = Read-UserInput "  是否使用模板重置? (y/N)" "N"
        if ($overwrite -notin @("y", "Y")) {
            Write-Info "在现有 .env 文件基础上修改"
        } else {
            Copy-Item "env.docker.example" ".env" -Force
            Write-Ok "已从模板重置 .env 文件"
        }
    } else {
        Copy-Item "env.docker.example" ".env" -Force
        Write-Ok "已从模板创建 .env 文件"
    }

    Write-Host ""
    Write-Info "请配置以下必要参数 (直接回车保留当前值):"
    Write-Host ""

    # AI API Key
    $currentKey = Get-EnvValue "IMAGE_API_KEY" ""
    $keyPrompt = "  AI API 密钥 (IMAGE_API_KEY)"
    if ($currentKey -and $currentKey -ne "sk-your-api-key-here") {
        $maskedKey = $currentKey.Substring(0, [Math]::Min(8, $currentKey.Length)) + "***"
        $apiKey = Read-UserInput $keyPrompt $maskedKey
        if ($apiKey -ne $maskedKey) {
            $content = Get-Content ".env" -Raw
            $content = $content -replace "IMAGE_API_KEY=.*", "IMAGE_API_KEY=$apiKey"
            [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
        }
    } else {
        $apiKey = Read-UserInput $keyPrompt
        if ($apiKey) {
            $content = Get-Content ".env" -Raw
            $content = $content -replace "IMAGE_API_KEY=.*", "IMAGE_API_KEY=$apiKey"
            [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
        }
    }

    # API Provider
    Write-Host ""
    Write-Host "  API 提供商选项:"
    Write-Host "    1) OpenAI       (https://api.openai.com)"
    Write-Host "    2) OpenRouter   (https://openrouter.ai/api/v1)"
    Write-Host "    3) 302.ai       (https://api.302.ai)"
    Write-Host "    4) 自定义 URL"
    $apiChoice = Read-UserInput "  请选择 (1-4)" "1"
    $apiBase = switch ($apiChoice) {
        "2" { "https://openrouter.ai/api/v1" }
        "3" { "https://api.302.ai" }
        "4" { Read-UserInput "  请输入自定义 API 地址" }
        default { "https://api.openai.com" }
    }
    $content = Get-Content ".env" -Raw
    $content = $content -replace "IMAGE_API_BASE_URL=.*", "IMAGE_API_BASE_URL=$apiBase"
    [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))

    # API Mode
    Write-Host ""
    Write-Host "  API 模式:"
    Write-Host "    1) images - 标准模式 (DALL-E 等)"
    Write-Host "    2) chat   - 流式模式 (Gemini 等)"
    $modeChoice = Read-UserInput "  请选择 (1-2)" "1"
    if ($modeChoice -eq "2") {
        $content = Get-Content ".env" -Raw
        $content = $content -replace "IMAGE_API_MODE=.*", "IMAGE_API_MODE=chat"
        [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
    }

    # Admin account
    Write-Host ""
    $currentAdmin = Get-EnvValue "ADMIN_EMAIL" "admin@example.com"
    $adminEmail = Read-UserInput "  管理员邮箱" $currentAdmin
    $content = Get-Content ".env" -Raw
    $content = $content -replace "ADMIN_EMAIL=.*", "ADMIN_EMAIL=$adminEmail"
    [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))

    $adminPass = Read-UserInput "  管理员密码" "change-me-please"
    $content = Get-Content ".env" -Raw
    $content = $content -replace "ADMIN_PASSWORD=.*", "ADMIN_PASSWORD=$adminPass"
    [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))

    # NextAuth Secret - always auto-generate
    Ensure-NextAuthSecret

    # Server URL
    $currentUrl = Get-EnvValue "NEXTAUTH_URL" "http://localhost:3000"
    $serverUrl = Read-UserInput "  服务器地址 (NEXTAUTH_URL)" $currentUrl
    $content = Get-Content ".env" -Raw
    $content = $content -replace "NEXTAUTH_URL=.*", "NEXTAUTH_URL=$serverUrl"
    [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))

    # Storage
    Write-Host ""
    Write-Host "  存储方式:"
    Write-Host "    1) MinIO (自托管，推荐用于 Docker 部署)"
    Write-Host "    2) 阿里云 OSS"
    $storageChoice = Read-UserInput "  请选择 (1-2)" "1"
    if ($storageChoice -eq "2") {
        $content = Get-Content ".env" -Raw
        $content = $content -replace "STORAGE_PROVIDER=.*", "STORAGE_PROVIDER=oss"
        [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host ""
        $ossRegion = Read-UserInput "  阿里云区域 (ALI_OSS_REGION)" "oss-cn-beijing"
        $ossKeyId = Read-UserInput "  访问密钥 ID (ALI_OSS_ACCESS_KEY_ID)"
        $ossKeySecret = Read-UserInput "  访问密钥密文 (ALI_OSS_ACCESS_KEY_SECRET)"
        $ossBucket = Read-UserInput "  存储桶名称 (ALI_OSS_BUCKET)"

        $content = Get-Content ".env" -Raw
        $content = $content -replace "# ALI_OSS_REGION=oss-cn-beijing", "ALI_OSS_REGION=$ossRegion"
        $content = $content -replace "# ALI_OSS_ACCESS_KEY_ID=", "ALI_OSS_ACCESS_KEY_ID=$ossKeyId"
        $content = $content -replace "# ALI_OSS_ACCESS_KEY_SECRET=", "ALI_OSS_ACCESS_KEY_SECRET=$ossKeySecret"
        $content = $content -replace "# ALI_OSS_BUCKET=", "ALI_OSS_BUCKET=$ossBucket"
        [System.IO.File]::WriteAllText((Resolve-Path ".env").Path, $content, [System.Text.UTF8Encoding]::new($false))
    }

    Write-Ok "配置已保存到 .env 文件"
}

# ============================================================
# 检测存储模式 - 读取 .env 中的 STORAGE_PROVIDER 配置
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
# 服务管理 - Docker 容器的启动、停止、重启等操作
# ============================================================
function Start-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "正在启动服务..."
    Invoke-Compose @($profiles, "up", "-d", "--build")
    Write-Host ""
    Write-Ok "服务启动成功！"
    Write-Host ""
    Show-StatusUrls
}

function Stop-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "正在停止服务..."
    Invoke-Compose @($profiles, "down")
    Write-Ok "服务已停止"
}

function Restart-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "正在重启服务..."
    Invoke-Compose @($profiles, "restart")
    Write-Ok "服务已重启"
}

function Rebuild-Services {
    $profiles = Get-ComposeProfiles
    Write-Info "正在重新构建并启动服务..."
    Invoke-Compose @($profiles, "up", "-d", "--build", "--force-recreate")
    Write-Ok "服务重建并启动成功"
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

    Write-Host "  访问地址:" -ForegroundColor Cyan
    Write-Host "    应用:      http://localhost:$appPort"
    Write-Host "    健康检查:   http://localhost:$appPort/api/health"
    if ($provider -eq "minio") {
        $minioConsole = Get-EnvValue "MINIO_CONSOLE_PORT" "9001"
        Write-Host "    MinIO:    http://localhost:$minioConsole"
    }
    Write-Host ""
}

# ============================================================
# 数据库备份与恢复 - 数据库备份和从备份文件恢复
# ============================================================
function Backup-Database {
    $backupDir = "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$backupDir\ai_wedding_$timestamp.sql"

    $dbUser = Get-EnvValue "POSTGRES_USER" "aiwedding"
    $dbName = Get-EnvValue "POSTGRES_DB" "ai_wedding"

    Write-Info "正在备份数据库到 $backupFile..."
    docker exec ai-wedding-db pg_dump -U $dbUser $dbName | Out-File -Encoding UTF8 $backupFile

    $size = (Get-Item $backupFile).Length / 1KB
    Write-Ok "备份完成: $backupFile ($([math]::Round($size, 1)) KB)"
}

function Restore-Database {
    $backupDir = "backups"

    if (-not (Test-Path $backupDir)) {
        Write-Err "未找到备份目录"
        exit 1
    }

    $backups = Get-ChildItem "$backupDir\*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10
    if (-not $backups -or $backups.Count -eq 0) {
        Write-Err "在 $backupDir\ 中未找到备份文件"
        exit 1
    }

    Write-Host ""
    Write-Info "可用的备份文件:"
    $i = 1
    foreach ($b in $backups) {
        Write-Host "  $i) $($b.Name)"
        $i++
    }
    Write-Host ""

    $choice = Read-UserInput "  请输入要恢复的备份编号 (1-$($backups.Count))"
    $idx = [int]$choice - 1
    if ($idx -lt 0 -or $idx -ge $backups.Count) {
        Write-Err "无效的选择"
        exit 1
    }

    $selectedFile = $backups[$idx].FullName
    $dbUser = Get-EnvValue "POSTGRES_USER" "aiwedding"
    $dbName = Get-EnvValue "POSTGRES_DB" "ai_wedding"

    Write-Warn "此操作将覆盖当前数据库！"
    $confirm = Read-UserInput "  是否继续? (y/N)" "N"
    if ($confirm -notin @("y", "Y")) {
        Write-Info "恢复操作已取消"
        return
    }

    Write-Info "正在从 $($backups[$idx].Name) 恢复..."
    Get-Content $selectedFile | docker exec -i ai-wedding-db psql -U $dbUser $dbName
    Write-Ok "数据库恢复完成"
}

# ============================================================
# 帮助信息 - 显示脚本使用方法
# ============================================================
function Show-Usage {
    Write-Host "用法: .\deploy.ps1 [命令]"
    Write-Host ""
    Write-Host "可用命令:"
    Write-Host "  (无参数)     自动部署（已配置则直接启动，未配置则交互式配置）"
    Write-Host "  init        强制进入交互式配置（重新配置 .env）"
    Write-Host "  up          启动所有服务"
    Write-Host "  down        停止所有服务"
    Write-Host "  restart     重启所有服务"
    Write-Host "  rebuild     重新构建镜像并启动"
    Write-Host "  logs        查看所有服务日志"
    Write-Host "  logs app    仅查看应用服务日志"
    Write-Host "  status      显示服务运行状态"
    Write-Host "  backup      备份数据库"
    Write-Host "  restore     从备份恢复数据库"
}

# ============================================================
# 主入口 - 根据命令参数执行相应操作
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
    "init"    {
        Set-EnvFile
        Write-Ok "配置完成，运行 .\deploy.ps1 开始部署"
    }
    ""        {
        Ensure-EnvFile
        Write-Host ""
        Write-Info "开始部署..."
        Write-Host ""
        Start-Services
        Write-Host ""
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host "  部署完成！"                                    -ForegroundColor Green
        Write-Host "==============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "  常用命令:"
        Write-Host "    .\deploy.ps1 status    - 查看服务状态"
        Write-Host "    .\deploy.ps1 logs      - 查看所有日志"
        Write-Host "    .\deploy.ps1 logs app  - 查看应用日志"
        Write-Host "    .\deploy.ps1 restart   - 重启服务"
        Write-Host "    .\deploy.ps1 rebuild   - 重新构建并启动"
        Write-Host "    .\deploy.ps1 down      - 停止服务"
        Write-Host "    .\deploy.ps1 backup    - 备份数据库"
        Write-Host "    .\deploy.ps1 restore   - 恢复数据库"
        Write-Host ""
    }
    default   { Show-Usage }
}
