# Contribuindo para este projeto

Obrigado por contribuir! Siga as diretrizes abaixo para manter o repositório organizado e padronizado.

## Requisitos de ambiente

- Backend (Python 3.11+)
  - `python -m venv .venv`
  - Ative o ambiente virtual e instale: `pip install -r requirements.txt`
  - Desenvolvimento: `uvicorn app.main:app --reload`
- Frontend (Node 18 LTS)
  - `cd frontend`
  - `npm ci`
  - Desenvolvimento: `npm run dev`
  - Build: `npm run build`

Observação: o frontend deve ser servido via um servidor HTTP (ex.: Vite dev server) para funcionar corretamente com o backend, e não aberto diretamente como arquivo local.

## Padrão de commits (Conventional Commits)

Formato: `tipo(escopo): descrição breve`

Tipos comuns:

- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: documentação
- `style`: formatação (sem mudança de lógica)
- `refactor`: refatoração
- `perf`: performance
- `test`: testes
- `build`: alterações de build/deps
- `ci`: configuração de CI
- `chore`: tarefas diversas

Exemplos:

- `feat(auth): adicionar fluxo de registro`
- `fix(products): corrigir paginação no endpoint`

## Fluxo de branches

- `main`: estável
- Crie branches a partir de `main` usando o padrão: `tipo/descricao-curta` (ex.: `feat/login-page`)
- Abra Pull Requests para `main`. Solicite revisão quando pronto.

## Padronização de código

- Respeite `.editorconfig`
- Python: prefira tipagem, nomes claros e funções curtas
- Frontend: siga o linter/formatador configurado no projeto; use componentes e hooks de forma idiomática

## Checagens locais

- Backend: `python -m py_compile $(git ls-files "*.py")` (Linux/Mac) ou use lint no editor
- Frontend: `npm run build` para garantir que o bundle gera sem erros

## Pull Requests

- Descreva claramente o problema e a solução
- Inclua evidências visuais quando for mudança de UI
- Relacione issues (ex.: `Closes #123`)

Obrigado por contribuir! 💙
