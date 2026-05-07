@echo off
REM Script de teste para verificar instalação limpa
REM PC Express - Sistema de Gerenciamento de Estoque

echo 🧪 Iniciando testes de instalação do PC Express...
echo ==================================================
echo.

REM Contador de testes
set TESTS_PASSED=0
set TESTS_FAILED=0

REM Função para executar teste
:run_test
set test_name=%1
set test_command=%2

echo [INFO] Executando: %test_name%

%test_command% >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] ✅ %test_name% - PASSOU
    set /a TESTS_PASSED+=1
) else (
    echo [ERROR] ❌ %test_name% - FALHOU
    set /a TESTS_FAILED+=1
)
echo.
goto :eof

REM Teste 1: Verificar Python
call :run_test "Verificar Python" "python --version"

REM Teste 2: Verificar Node.js
call :run_test "Verificar Node.js" "node --version"

REM Teste 3: Verificar npm
call :run_test "Verificar npm" "npm --version"

REM Teste 4: Verificar arquivos necessários
call :run_test "Verificar requirements.txt" "if exist requirements.txt echo OK"

REM Teste 5: Verificar package.json
call :run_test "Verificar package.json" "if exist frontend\package.json echo OK"

REM Teste 6: Verificar scripts de setup
call :run_test "Verificar setup.bat" "if exist setup.bat echo OK"

REM Teste 7: Verificar scripts de start
call :run_test "Verificar start.ps1" "if exist start.ps1 echo OK"

REM Teste 8: Verificar Dockerfiles
call :run_test "Verificar Dockerfile.backend" "if exist Dockerfile.backend echo OK"

REM Teste 9: Verificar Dockerfile.frontend
call :run_test "Verificar Dockerfile.frontend" "if exist Dockerfile.frontend echo OK"

REM Teste 10: Verificar docker-compose.yml
call :run_test "Verificar docker-compose.yml" "if exist docker-compose.yml echo OK"

REM Teste 11: Verificar se Python pode importar módulos
call :run_test "Verificar imports Python" "python -c \"import sys; print('Python funcionando')\""

REM Teste 12: Verificar se Node.js pode executar
call :run_test "Verificar Node.js" "node -e \"console.log('Node.js funcionando')\""

REM Teste 13: Verificar se npm pode instalar
call :run_test "Verificar npm install" "cd frontend && npm install --dry-run"

REM Teste 14: Verificar se pip pode instalar
call :run_test "Verificar pip install" "pip install --dry-run -r requirements.txt"

REM Teste 15: Verificar se Docker está disponível (opcional)
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    call :run_test "Verificar Docker" "docker --version"
) else (
    echo [WARNING] Docker não encontrado (opcional)
    echo.
)

REM Teste 16: Verificar se docker-compose está disponível (opcional)
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    call :run_test "Verificar docker-compose" "docker-compose --version"
) else (
    echo [WARNING] docker-compose não encontrado (opcional)
    echo.
)

echo ==================================================
echo 📊 Resultados dos Testes:
echo ==================================================
echo ✅ Testes que passaram: %TESTS_PASSED%
echo ❌ Testes que falharam: %TESTS_FAILED%
set /a TOTAL=%TESTS_PASSED%+%TESTS_FAILED%
echo 📈 Total de testes: %TOTAL%

if %TESTS_FAILED% equ 0 (
    echo [SUCCESS] 🎉 Todos os testes passaram! O projeto está pronto para instalação.
    echo.
    echo Para instalar o projeto:
    echo 1. Execute: setup.bat
    echo 2. Execute: start.ps1
    echo.
    echo Ou use Docker:
    echo 1. Execute: docker-compose up --build
    pause
    exit /b 0
) else (
    echo [ERROR] ⚠️  Alguns testes falharam. Verifique os pré-requisitos.
    echo.
    echo Pré-requisitos necessários:
    echo - Python 3.8+
    echo - Node.js 16+
    echo - npm
    echo - Docker (opcional)
    echo - docker-compose (opcional)
    pause
    exit /b 1
)
