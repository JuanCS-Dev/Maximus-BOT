# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Instalar OpenSSL e dependências necessárias para Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código fonte e compilar
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Instalar OpenSSL e dependências necessárias para Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de configuração
COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção
RUN npm ci --only=production

# Gerar Prisma Client em produção
RUN npx prisma generate

# Copiar build do stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretório de logs
RUN mkdir -p logs

# Usuário não-root para segurança
USER node

# Cloud Run usa variável de ambiente PORT
ENV PORT=8080
EXPOSE $PORT

CMD ["node", "dist/index.js"]
