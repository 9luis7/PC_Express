# PC-Express - Script de Inicialização Unificado
# Executa tudo automaticamente: verifica dependências, instala se necessário, inicia servidores e abre navegador
# Versão corrigida com auto-reinicialização e otimizações
param(
    [switch]$SkipBrowser,
    [switch]$Force,
    [switch]$Debug
)

$BackendPort = 8000
$FrontendPort = 5173
$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"
$LoginUrl = "$FrontendUrl/login"

# Variáveis de controle
$MaxRestartAttempts = 5
$HealthCheckInterval = 10
$RestartDelay = 3
$MaxMemoryUsage = 80
$BrowserOpened = $false

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Write-Debug {
    param([string]$Message)
    if ($Debug) {
        Write-ColorOutput "DEBUG: $Message" "Gray"
    }
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

function Test-Port {
    param([int]$Port)
    try {
        # Verificar IPv4
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    }
    catch {
        try {
            # Verificar IPv6
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("::1", $Port)
            $connection.Close()
            return $true
        }
        catch {
            return $false
        }
    }
}

function Test-ServerHealth {
    param([string]$Url, [string]$ServerName)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return $response.StatusCode -eq 200
    }
    catch {
        Write-Debug "$ServerName health check failed: $($_.Exception.Message)"
        return $false
    }
}

function Get-MemoryUsage {
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $usedMemory = $totalMemory - $freeMemory
    $memoryPercent = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
    return $memoryPercent
}

function Test-SystemResources {
    $memoryUsage = Get-MemoryUsage
    if ($memoryUsage -gt $MaxMemoryUsage) {
        Write-ColorOutput "AVISO: Uso de memória alto ($memoryUsage%)" "Yellow"
        return $false
    }
    return $true
}

function Stop-ExistingServers {
    Write-ColorOutput "Parando servidores existentes..." "Yellow"

    # Parar por porta usando netstat (mais confiável)
    try {
        # Backend
        $backendPids = netstat -ano | Select-String ":8000" | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Where-Object { $_ -ne "0" }

        foreach ($pid in $backendPids) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Debug "Parou processo backend PID: $pid"
            }
            catch {
                Write-Debug "Erro ao parar processo $pid: $($_.Exception.Message)"
            }
        }

        # Frontend
        $frontendPids = netstat -ano | Select-String ":5173" | ForEach-Object {
            ($_ -split '\s+')[-1]
        } | Where-Object { $_ -ne "0" }

        foreach ($pid in $frontendPids) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Debug "Parou processo frontend PID: $pid"
            }
            catch {
                Write-Debug "Erro ao parar processo $pid: $($_.Exception.Message)"
            }
        }

        Start-Sleep -Seconds 3
    }
    catch {
        Write-Debug "Error stopping existing processes: $($_.Exception.Message)"
    }
}

function Start-BackendServer {
    Write-ColorOutput "Iniciando Backend..." "Yellow"

    $scriptBlock = {
        param($WorkingDir, $Port)
        Set-Location $WorkingDir
        $env:PYTHONPATH = $WorkingDir
        $env:PYTHONUNBUFFERED = "1"
        $env:PYTHONIOENCODING = "utf-8"

        try {
            # Usar uvicorn padrão com otimizações integradas no sistema
            & ".venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 30 --timeout-graceful-shutdown 30 --limit-concurrency 1000 --limit-max-requests 10000 --backlog 2048
        }
        catch {
            Write-Error "Backend failed to start: $($_.Exception.Message)"
            exit 1
        }
    }

    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $PWD, $BackendPort
    return $job
}

function Start-FrontendServer {
    Write-ColorOutput "Iniciando Frontend..." "Yellow"

    $scriptBlock = {
        param($WorkingDir, $Port)

        # Configurações otimizadas para Node.js
        $env:NODE_OPTIONS = "--max-old-space-size=2048 --max-semi-space-size=128"
        $env:NODE_ENV = "development"

        try {
            Set-Location "$WorkingDir\frontend"
            npm run dev -- --port $Port --strictPort --host localhost
        }
        catch {
            Write-Error "Frontend failed to start: $($_.Exception.Message)"
            exit 1
        }
    }

    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $PWD, $FrontendPort
    return $job
}

function Wait-ForServer {
    param([string]$Url, [string]$ServerName, [int]$MaxWaitSeconds = 30)

    Write-ColorOutput "Aguardando $ServerName iniciar..." "Yellow"
    $attempts = 0
    $maxAttempts = $MaxWaitSeconds / 2

    while ($attempts -lt $maxAttempts) {
        if ($ServerName -eq "Frontend") {
            # Para frontend, usar netstat para verificar se a porta está em uso
            $portCheck = netstat -ano | Select-String ":5173" | Select-Object -First 1
            if ($portCheck) {
                Write-ColorOutput "OK: $ServerName está rodando!" "Green"
                return $true
            }
        } else {
            # Para o backend, usar verificação HTTP
            if (Test-ServerHealth $Url $ServerName) {
                Write-ColorOutput "OK: $ServerName está rodando!" "Green"
                return $true
            }
        }

        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "." -NoNewline
    }

    Write-Host ""
    Write-ColorOutput "ERRO: $ServerName não iniciou em $MaxWaitSeconds segundos" "Red"
    return $false
}

function Open-BrowserOnce {
    param([string]$Url)

    if (-not $BrowserOpened -and -not $SkipBrowser) {
        Write-ColorOutput "Abrindo navegador..." "Cyan"
        try {
            Start-Process $Url
            $script:BrowserOpened = $true
            Write-ColorOutput "OK: Navegador aberto em $Url" "Green"
        }
        catch {
            Write-ColorOutput "ERRO: Não foi possível abrir o navegador" "Red"
        }
    }
}

function Monitor-Servers {
    param([System.Management.Automation.Job]$BackendJob, [System.Management.Automation.Job]$FrontendJob)

    $backendRestartCount = 0
    $frontendRestartCount = 0
    $lastBackendCheck = Get-Date
    $lastFrontendCheck = Get-Date
    $lastResourceCheck = Get-Date
    $lastBrowserCheck = Get-Date

    Write-ColorOutput "Iniciando monitoramento de servidores..." "Cyan"
    Write-ColorOutput "Pressione Ctrl+C para parar" "Yellow"

    while ($true) {
        $currentTime = Get-Date

        # Verificar recursos do sistema a cada 30 segundos
        if (($currentTime - $lastResourceCheck).TotalSeconds -ge 30) {
            if (-not (Test-SystemResources)) {
                Write-ColorOutput "AVISO: Recursos do sistema baixos, considerando reinicialização" "Yellow"
            }
            $lastResourceCheck = $currentTime
        }

        # Verificar backend a cada HealthCheckInterval segundos
        if (($currentTime - $lastBackendCheck).TotalSeconds -ge $HealthCheckInterval) {
            $backendHealthy = Test-ServerHealth "$BackendUrl/health" "Backend"
            $lastBackendCheck = $currentTime

            if (-not $backendHealthy) {
                Write-ColorOutput "AVISO: Backend não está respondendo" "Yellow"

                # Verificar se o job ainda está rodando
                if ($BackendJob.State -ne "Running") {
                    Write-ColorOutput "Backend job parou inesperadamente" "Red"

                    if ($backendRestartCount -lt $MaxRestartAttempts) {
                        Write-ColorOutput "Tentando reiniciar backend (tentativa $($backendRestartCount + 1)/$MaxRestartAttempts)..." "Yellow"
                        Remove-Job $BackendJob -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds $RestartDelay
                        $BackendJob = Start-BackendServer
                        $backendRestartCount++

                        if (Wait-ForServer "$BackendUrl/health" "Backend" 20) {
                            Write-ColorOutput "Backend reiniciado com sucesso!" "Green"
                            $backendRestartCount = 0  # Reset counter on success
                        }
                    } else {
                        Write-ColorOutput "ERRO: Máximo de tentativas de reinicialização do backend atingido" "Red"
                        break
                    }
                }
            } else {
                $backendRestartCount = 0  # Reset counter on success
            }
        }

        # Verificar frontend a cada HealthCheckInterval segundos
        if (($currentTime - $lastFrontendCheck).TotalSeconds -ge $HealthCheckInterval) {
            $frontendHealthy = Test-ServerHealth $FrontendUrl "Frontend"
            $lastFrontendCheck = $currentTime

            if (-not $frontendHealthy) {
                Write-ColorOutput "AVISO: Frontend não está respondendo" "Yellow"

                # Verificar se o job ainda está rodando
                if ($FrontendJob.State -ne "Running") {
                    Write-ColorOutput "Frontend job parou inesperadamente" "Red"

                    if ($frontendRestartCount -lt $MaxRestartAttempts) {
                        Write-ColorOutput "Tentando reiniciar frontend (tentativa $($frontendRestartCount + 1)/$MaxRestartAttempts)..." "Yellow"
                        Remove-Job $FrontendJob -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds $RestartDelay
                        $FrontendJob = Start-FrontendServer
                        $frontendRestartCount++

                        if (Wait-ForServer $FrontendUrl "Frontend" 20) {
                            Write-ColorOutput "Frontend reiniciado com sucesso!" "Green"
                            $frontendRestartCount = 0  # Reset counter on success
                        }
                    } else {
                        Write-ColorOutput "ERRO: Máximo de tentativas de reinicialização do frontend atingido" "Red"
                        break
                    }
                }
            } else {
                $frontendRestartCount = 0  # Reset counter on success
            }
        }

        # Abrir navegador uma vez quando ambos os servidores estiverem prontos
        if (($currentTime - $lastBrowserCheck).TotalSeconds -ge 5) {
            if (-not $BrowserOpened -and (Test-ServerHealth "$BackendUrl/health" "Backend") -and (Test-ServerHealth $FrontendUrl "Frontend")) {
                Open-BrowserOnce $LoginUrl
            }
            $lastBrowserCheck = $currentTime
        }

        Start-Sleep -Seconds 3
    }

    return $BackendJob, $FrontendJob
}

# Função principal
Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "   PC-Express - Inicialização Unificada" "Blue"
Write-ColorOutput "========================================" "Blue"
Write-Host ""

# Verificar dependências
Write-ColorOutput "1. Verificando dependências..." "Cyan"

if (-not (Test-Command "python")) {
    Write-ColorOutput "ERRO: Python não encontrado!" "Red"
    Write-ColorOutput "Por favor, instale Python 3.8+ de: https://www.python.org/downloads/" "Cyan"
    exit 1
}

$pythonVersion = python --version 2>&1
Write-ColorOutput "OK: Python encontrado - $pythonVersion" "Green"

if (-not (Test-Command "node")) {
    Write-ColorOutput "ERRO: Node.js não encontrado!" "Red"
    Write-ColorOutput "Por favor, instale Node.js 16+ de: https://nodejs.org/" "Cyan"
    exit 1
}

$nodeVersion = node --version 2>&1
Write-ColorOutput "OK: Node.js encontrado - $nodeVersion" "Green"

# Verificar recursos do sistema
Write-ColorOutput "`nVerificando recursos do sistema..." "Cyan"
$memoryUsage = Get-MemoryUsage
Write-ColorOutput "Uso de memória: $memoryUsage%" "White"

if ($memoryUsage -gt 90) {
    Write-ColorOutput "AVISO: Uso de memória muito alto ($memoryUsage%)" "Yellow"
    Write-ColorOutput "Considere fechar outros programas" "Yellow"
}

# Configurar ambiente
Write-ColorOutput "`n2. Configurando ambiente..." "Cyan"

if (-not (Test-Path ".venv")) {
    Write-ColorOutput "Criando ambiente virtual..." "Yellow"
    python -m venv .venv
}

if (-not (Test-Path ".venv\Lib\site-packages\fastapi")) {
    Write-ColorOutput "Instalando dependências Python..." "Yellow"
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip
    & ".venv\Scripts\python.exe" -m pip install -r requirements.txt --no-input
}

if (-not (Test-Path "inventory.db")) {
    Write-ColorOutput "Configurando banco de dados..." "Yellow"
    & ".venv\Scripts\python.exe" scripts/setup_db.py
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-ColorOutput "Instalando dependências Node.js..." "Yellow"
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-ColorOutput "OK: Ambiente configurado" "Green"

# Parar servidores existentes
if ($Force -or (Test-Port $BackendPort) -or (Test-Port $FrontendPort)) {
    Stop-ExistingServers
}

# Iniciar servidores
Write-ColorOutput "`n3. Iniciando servidores..." "Cyan"

$backendJob = Start-BackendServer
if (-not (Wait-ForServer "$BackendUrl/health" "Backend")) {
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

$frontendJob = Start-FrontendServer
if (-not (Wait-ForServer $FrontendUrl "Frontend")) {
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    exit 1
}

# Mostrar informações
Write-ColorOutput "`n========================================" "Blue"
Write-ColorOutput "   PC-Express Inicializado!" "Green"
Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "`nURLs de Acesso:" "Cyan"
Write-ColorOutput "Sistema: $FrontendUrl" "Green"
Write-ColorOutput "Login:   $LoginUrl" "Green"
Write-ColorOutput "API:     $BackendUrl" "Green"
Write-ColorOutput "Docs:    $BackendUrl/docs" "Green"
Write-ColorOutput "`nCredenciais:" "Cyan"
Write-ColorOutput "Email: admin@pc-express.com" "Green"
Write-ColorOutput "Senha: admin123" "Green"

# Monitorar servidores
try {
    $backendJob, $frontendJob = Monitor-Servers $backendJob $frontendJob
}
catch {
    Write-ColorOutput "`nInterrompido pelo usuário" "Yellow"
}
finally {
    Write-ColorOutput "`nParando servidores..." "Yellow"
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Stop-ExistingServers
    Write-ColorOutput "Servidores parados" "Green"
}
