@echo off
REM PC-Express - Script de Inicialização Simples (Windows)
REM Alternativa ao start.ps1 para usuários com restrições de execução de scripts

echo ========================================
echo    PC-Express - Inicializacao Simples
echo ========================================
echo.

REM Verificar se Python está instalado
echo 1. Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado!
    echo Por favor, instale Python 3.8+ de: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo OK: Python encontrado

REM Verificar se Node.js está instalado
echo.
echo 2. Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale Node.js 16+ de: https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js encontrado

REM Configurar ambiente Python
echo.
echo 3. Configurando ambiente Python...
if not exist ".venv" (
    echo Criando ambiente virtual...
    python -m venv .venv
)

if not exist ".venv\Lib\site-packages\fastapi" (
    echo Instalando dependencias Python...
    .venv\Scripts\python.exe -m pip install --upgrade pip
    .venv\Scripts\python.exe -m pip install -r requirements.txt --no-input
)

REM Configurar banco de dados
if not exist "inventory.db" (
    echo Configurando banco de dados...
    .venv\Scripts\python.exe scripts/setup_db.py
)

REM Configurar ambiente Node.js
echo.
echo 4. Configurando ambiente Node.js...
if not exist "frontend\node_modules" (
    echo Instalando dependencias Node.js...
    cd frontend
    npm install
    cd ..
)

REM Parar processos existentes nas portas
echo.
echo 5. Parando processos existentes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Iniciar Backend
echo.
echo 6. Iniciando Backend...
start "PC-Express Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

REM Aguardar backend iniciar
echo Aguardando backend iniciar...
timeout /t 5 /nobreak >nul

REM Iniciar Frontend
echo.
echo 7. Iniciando Frontend...
start "PC-Express Frontend" cmd /k "cd frontend && npm run dev"

REM Aguardar frontend iniciar
echo Aguardando frontend iniciar...
timeout /t 10 /nobreak >nul

REM Abrir navegador
echo.
echo 8. Abrindo navegador...
start http://localhost:5173/login

REM Mostrar informações
echo.
echo ========================================
echo    PC-Express Inicializado!
echo ========================================
echo.
echo URLs de Acesso:
echo Sistema: http://localhost:5173
echo Login:   http://localhost:5173/login
echo API:     http://localhost:8000
echo Docs:    http://localhost:8000/docs
echo.
echo Credenciais:
echo Email: admin@pc-express.com
echo Senha: admin123
echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servidores continuarao rodando em janelas separadas)
pause >nul
