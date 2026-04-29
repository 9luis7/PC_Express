@echo off
REM ============================================================================
REM PC-Express - Inicializador Principal
REM Sistema de Gerenciamento de Estoque com Machine Learning
REM ============================================================================
REM
REM USO:
REM   iniciar.bat           - Inicia o sistema normalmente
REM   iniciar.bat --help    - Mostra opcoes disponiveis
REM
REM OUTROS SCRIPTS:
REM   bin\start\stop.bat              - Para os servidores
REM   bin\test\test-installation.bat  - Testa a instalacao
REM   bin\quality\validate.bat        - Valida qualidade do codigo
REM   bin\deploy\deploy-portainer.sh  - Deploy com Docker
REM ============================================================================

setlocal enabledelayedexpansion

REM Verificar argumentos
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="/?" goto :show_help

title PC-Express - Inicializador

echo.
echo ============================================================
echo    PC-Express - Sistema de Gerenciamento de Estoque
echo ============================================================
echo.

REM ============================
REM ETAPA 1: Verificar Dependencias
REM ============================
echo [1/5] Verificando dependencias...
echo.

echo    Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo    [ERRO] Python nao encontrado!
    echo.
    echo    SOLUCAO:
    echo    1. Baixe Python 3.8+ de: https://www.python.org/downloads/
    echo    2. Durante a instalacao, marque "Add Python to PATH"
    echo    3. Reinicie o terminal e tente novamente
    echo.
    pause
    exit /b 1
)
echo    [OK] Python encontrado

echo    Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo    [ERRO] Node.js nao encontrado!
    echo.
    echo    SOLUCAO:
    echo    1. Baixe Node.js 16+ de: https://nodejs.org/
    echo    2. Instale e reinicie o terminal
    echo    3. Tente novamente
    echo.
    pause
    exit /b 1
)
echo    [OK] Node.js encontrado

echo.
echo    [OK] Todas as dependencias encontradas!
echo.

REM ============================
REM ETAPA 2: Configurar Ambiente
REM ============================
echo [2/5] Configurando ambiente...
echo.

if not exist ".venv" (
    echo    Criando ambiente virtual Python...
    python -m venv .venv
    if errorlevel 1 (
        echo    [ERRO] Falha ao criar ambiente virtual
        pause
        exit /b 1
    )
)

REM Verificar se precisa instalar dependencias Python
.venv\Scripts\python.exe -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo    Instalando dependencias Python ^(isso pode demorar^)...
    .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
    .venv\Scripts\python.exe -m pip install -r requirements.txt --no-input --quiet
    if errorlevel 1 (
        echo    [ERRO] Falha ao instalar dependencias Python
        pause
        exit /b 1
    )
)
echo    [OK] Ambiente Python configurado

if not exist "inventory.db" (
    echo    Configurando banco de dados...
    echo    (Criando tabelas e usuario admin)
    .venv\Scripts\python.exe scripts/setup_db.py
    if errorlevel 1 (
        echo    [ERRO] Falha ao configurar banco de dados
        echo    Tente executar manualmente: .venv\Scripts\python.exe scripts/setup_db.py
        pause
        exit /b 1
    )
    echo    [OK] Banco de dados criado com sucesso!
) else (
    echo    [OK] Banco de dados ja existe
)

if not exist "frontend\node_modules" (
    echo    Instalando dependencias Node.js ^(isso pode demorar^)...
    cd frontend
    call npm install --silent >nul 2>&1
    cd ..
    if errorlevel 1 (
        echo    [ERRO] Falha ao instalar dependencias Node.js
        pause
        exit /b 1
    )
)
echo    [OK] Ambiente Node.js configurado

echo.
echo    [OK] Ambiente configurado com sucesso!
echo.

REM ============================
REM ETAPA 3: Parar Servidores Existentes
REM ============================
echo [3/5] Verificando servidores existentes...
echo.

set "FOUND_PROCESSES=0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" 2^>nul') do (
    set "FOUND_PROCESSES=1"
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" 2^>nul') do (
    set "FOUND_PROCESSES=1"
    taskkill /F /PID %%a >nul 2>&1
)

if "!FOUND_PROCESSES!"=="1" (
    echo    [OK] Servidores anteriores parados
    timeout /t 2 /nobreak >nul
) else (
    echo    [OK] Nenhum servidor anterior encontrado
)

echo.

REM ============================
REM ETAPA 4: Iniciar Servidores
REM ============================
echo [4/5] Iniciando servidores...
echo.

echo    Iniciando Backend (FastAPI)...
start "PC-Express Backend" /min cmd /c ".venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 && echo Backend encerrado. && pause"

timeout /t 3 /nobreak >nul

echo    Iniciando Frontend (React)...
start "PC-Express Frontend" /min cmd /c "cd frontend && npm run dev && echo Frontend encerrado. && pause"

echo.
echo    [OK] Servidores iniciados
echo.

REM ============================
REM ETAPA 5: Aguardar e Abrir Navegador
REM ============================
echo [5/5] Aguardando servidores ficarem prontos...
echo.

echo    Aguarde enquanto os servidores inicializam...
timeout /t 8 /nobreak >nul

echo    Abrindo navegador...
start http://localhost:5173/login

echo.
echo ============================================================
echo    PC-Express Iniciado com Sucesso!
echo ============================================================
echo.
echo URLs de Acesso:
echo    Sistema:  http://localhost:5173
echo    Login:    http://localhost:5173/login
echo    API Docs: http://localhost:8000/docs
echo.
echo Credenciais Padrao:
echo    Email: admin@pc-express.com
echo    Senha: admin123
echo.
echo Comandos Uteis:
echo    Parar:     bin\start\stop.bat
echo    Testar:    bin\test\test-installation.bat
echo    Validar:   bin\quality\validate.bat
echo.
echo Os servidores estao rodando em janelas minimizadas.
echo Feche essas janelas OU execute bin\start\stop.bat para parar.
echo.
pause
exit /b 0

:show_help
echo.
echo PC-Express - Sistema de Gerenciamento de Estoque
echo ============================================================
echo.
echo USO:
echo    iniciar.bat           Inicia o sistema
echo    iniciar.bat --help    Mostra esta ajuda
echo.
echo ESTRUTURA DE SCRIPTS:
echo.
echo    bin\start\
echo        start.bat         - Alternativa de inicializacao (simples)
echo        start.ps1         - Inicializacao avancada (PowerShell)
echo        stop.bat          - Para os servidores
echo.
echo    bin\test\
echo        test-installation.bat  - Testa instalacao (Windows)
echo        test-installation.sh   - Testa instalacao (Linux/Mac)
echo.
echo    bin\quality\
echo        validate.bat      - Valida codigo (Windows)
echo        validate.sh       - Valida codigo (Linux/Mac)
echo.
echo    bin\deploy\
echo        deploy-portainer.sh    - Deploy Docker
echo.
echo REQUISITOS:
echo    - Python 3.8+
echo    - Node.js 16+
echo    - Git
echo.
echo MAIS INFORMACOES:
echo    README.md             - Documentacao completa
echo    INICIO_RAPIDO.md      - Guia de inicio rapido
echo.
pause
exit /b 0
