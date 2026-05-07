#!/bin/bash

# Script de teste para verificar instalação limpa
# PC Express - Sistema de Gerenciamento de Estoque

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Contador de testes
TESTS_PASSED=0
TESTS_FAILED=0

# Função para executar teste
run_test() {
    local test_name="$1"
    local test_command="$2"

    print_status "Executando: $test_name"

    if eval "$test_command"; then
        print_success "✅ $test_name - PASSOU"
        ((TESTS_PASSED++))
    else
        print_error "❌ $test_name - FALHOU"
        ((TESTS_FAILED++))
    fi
    echo
}

echo "🧪 Iniciando testes de instalação do PC Express..."
echo "=================================================="
echo

# Teste 1: Verificar Python
run_test "Verificar Python" "python3 --version"

# Teste 2: Verificar Node.js
run_test "Verificar Node.js" "node --version"

# Teste 3: Verificar npm
run_test "Verificar npm" "npm --version"

# Teste 4: Verificar arquivos necessários
run_test "Verificar requirements.txt" "test -f requirements.txt"

# Teste 5: Verificar package.json
run_test "Verificar package.json" "test -f frontend/package.json"

# Teste 6: Verificar scripts de setup
run_test "Verificar setup.sh" "test -f setup.sh"

# Teste 7: Verificar scripts de start
run_test "Verificar start.sh" "test -f start.sh"

# Teste 8: Verificar Dockerfiles
run_test "Verificar Dockerfile.backend" "test -f Dockerfile.backend"

# Teste 9: Verificar Dockerfile.frontend
run_test "Verificar Dockerfile.frontend" "test -f Dockerfile.frontend"

# Teste 10: Verificar docker-compose.yml
run_test "Verificar docker-compose.yml" "test -f docker-compose.yml"

# Teste 11: Verificar se Python pode importar módulos
run_test "Verificar imports Python" "python3 -c 'import sys; print(f\"Python {sys.version}\")'"

# Teste 12: Verificar se Node.js pode executar
run_test "Verificar Node.js" "node -e 'console.log(\"Node.js funcionando\")'"

# Teste 13: Verificar se npm pode instalar
run_test "Verificar npm install" "cd frontend && npm install --dry-run"

# Teste 14: Verificar se pip pode instalar
run_test "Verificar pip install" "pip3 install --dry-run -r requirements.txt"

# Teste 15: Verificar se Docker está disponível (opcional)
if command -v docker &> /dev/null; then
    run_test "Verificar Docker" "docker --version"
else
    print_warning "Docker não encontrado (opcional)"
fi

# Teste 16: Verificar se docker-compose está disponível (opcional)
if command -v docker-compose &> /dev/null; then
    run_test "Verificar docker-compose" "docker-compose --version"
else
    print_warning "docker-compose não encontrado (opcional)"
fi

echo "=================================================="
echo "📊 Resultados dos Testes:"
echo "=================================================="
echo "✅ Testes que passaram: $TESTS_PASSED"
echo "❌ Testes que falharam: $TESTS_FAILED"
echo "📈 Total de testes: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "🎉 Todos os testes passaram! O projeto está pronto para instalação."
    echo
    echo "Para instalar o projeto:"
    echo "1. Execute: ./setup.sh"
    echo "2. Execute: ./start.sh"
    echo
    echo "Ou use Docker:"
    echo "1. Execute: docker-compose up --build"
    exit 0
else
    print_error "⚠️  Alguns testes falharam. Verifique os pré-requisitos."
    echo
    echo "Pré-requisitos necessários:"
    echo "- Python 3.8+"
    echo "- Node.js 16+"
    echo "- npm"
    echo "- Docker (opcional)"
    echo "- docker-compose (opcional)"
    exit 1
fi
