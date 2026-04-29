a"# Use a imagem base do Python
FROM mcr.microsoft.com/devcontainers/python:3.11

# Instalar Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
  git \
  curl \
  wget \
  vim \
  nano \
  && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /workspace

# Copiar arquivos de dependências
COPY requirements.txt .
COPY frontend/package*.json ./frontend/

# Instalar dependências Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalar dependências Node.js
RUN cd frontend && npm install

# Configurar ambiente
ENV PYTHONPATH=/workspace
ENV NODE_ENV=development

# Expor portas
EXPOSE 8000 5173

# Comando padrão
CMD ["bash"]
