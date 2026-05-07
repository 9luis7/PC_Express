# 🚀 Início Rápido - PC Express

## 🆕 Clonou o Projeto Agora?

**IMPORTANTE:** Se você acabou de clonar o projeto do GitHub, use:

```cmd
iniciar.bat
```

Este script irá:
1. ✅ Verificar dependências
2. ✅ Instalar tudo que for necessário
3. ✅ **Criar o banco de dados com usuário admin**
4. ✅ Iniciar os servidores automaticamente

> 💡 **Nota:** O banco de dados `inventory.db` não é versionado no Git, então o script cria automaticamente na primeira execução.

---

## Para Novos Usuários

### 📋 Pré-requisitos
- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)

### 🖥️ Windows

#### Opção 1: Script Principal (Recomendado)
```cmd
iniciar.bat
```

#### Opção 2: Script Alternativo
```cmd
bin\start\start.bat
```

#### Opção 2: PowerShell (Se tiver permissões)
```powershell
.\start.ps1
```

#### Opção 3: Se der erro de permissão no PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start.ps1
```

### 🐧 Linux / 🍎 Mac

```bash
./start.sh
```

Se der erro de permissão:
```bash
chmod +x start.sh
./start.sh
```

### 🔧 Início Manual (Se os scripts não funcionarem)

#### 1. Backend
```bash
# Windows
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Linux/Mac
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 2. Frontend
```bash
cd frontend
npm run dev
```

### 🌐 Acesso ao Sistema

Após iniciar, acesse:
- **Sistema**: http://localhost:5173
- **Login**: http://localhost:5173/login
- **API**: http://localhost:8000
- **Documentação**: http://localhost:8000/docs

### 🔑 Credenciais Padrão
- **Email**: admin@pc-express.com
- **Senha**: admin123

### ❓ Problemas Comuns

#### ⚠️ Senha Incorreta no Login (MAIS COMUM)
**Sintoma:** Login falha com "senha incorreta" mesmo usando `admin@pc-express.com / admin123`

**Causa:** O banco de dados não existe (foi clonado do Git sem o arquivo `inventory.db`)

**Solução:**
```cmd
# Opção 1: Execute o inicializador (cria automaticamente)
iniciar.bat

# Opção 2: Crie o banco manualmente
.venv\Scripts\activate
python scripts/setup_db.py
```

#### Erro de Permissão no PowerShell (Windows)
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Python não encontrado
- Instale Python 3.8+ e marque "Add to PATH" durante a instalação
- Reinicie o terminal após instalar

#### Node.js não encontrado
- Instale Node.js 16+ e reinicie o terminal

#### Porta já em uso
- Feche outros programas que possam estar usando as portas 8000 ou 5173
- Ou use o parâmetro `-Force` no PowerShell: `.\start.ps1 -Force`

### 🆘 Ainda com problemas?

1. **Verifique as dependências**:
   ```bash
   python --version
   node --version
   npm --version
   ```

2. **Instale dependências manualmente**:
   ```bash
   # Python
   python -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   
   # Node.js
   cd frontend
   npm install
   ```

3. **Execute os servidores separadamente**:
   - Terminal 1: Backend (comando acima)
   - Terminal 2: Frontend (comando acima)

### 📞 Suporte
Se ainda tiver problemas, verifique:
- [Issues do GitHub](https://github.com/Projeto-de-Python/CP_Python_PC_Express/issues)
- [Documentação completa](README.md)
