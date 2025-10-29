# 🎯 MANUAL ANTIBURRO
## Guia Definitivo do Vértice Discord Bot - Do Zero ao Deploy

> **"Se você consegue respirar, você consegue rodar este bot."**
>
> Este manual foi feito para pessoas que nunca mexeram com Discord bots, Node.js, Docker, ou qualquer outra tecnologia usada aqui. Se você seguir passo a passo, VAI FUNCIONAR.

---

## 📚 ÍNDICE

1. [O Que É Este Bot?](#1-o-que-é-este-bot)
2. [Pré-Requisitos (O Que Você Precisa Instalar)](#2-pré-requisitos)
3. [Configuração Inicial (Primeira Vez)](#3-configuração-inicial)
4. [Como Rodar o Bot (Modo Desenvolvimento)](#4-como-rodar-o-bot-modo-desenvolvimento)
5. [Como Rodar o Bot (Modo Produção com Docker)](#5-como-rodar-o-bot-modo-produção-com-docker)
6. [Configurando Integrações Externas](#6-configurando-integrações-externas)
7. [Comandos Disponíveis no Discord](#7-comandos-disponíveis-no-discord)
8. [Troubleshooting (Quando Algo Dá Errado)](#8-troubleshooting)
9. [Como Adicionar Novos Comandos](#9-como-adicionar-novos-comandos)
10. [Perguntas Frequentes (FAQ)](#10-perguntas-frequentes)
11. [Glossário (O Que Significa Cada Termo)](#11-glossário)

---

## 1. O QUE É ESTE BOT?

### 🤔 Em Português Claro

Este bot é um **guarda de segurança automatizado** para o seu servidor Discord. Ele:

- 🛡️ **Protege** contra spam, raids, e conteúdo malicioso
- 🔍 **Detecta ameaças** em tempo real (URLs suspeitas, malware, phishing)
- 🚨 **Alerta moderadores** quando encontra algo perigoso
- 📊 **Registra tudo** para auditoria e compliance
- 🤖 **Age automaticamente** (deleta mensagens, timeout em usuários, bane atacantes)
- 🔗 **Se conecta** com plataformas de inteligência de ameaças (MISP, OpenCTI)

### 🎯 Para Quem É Este Bot?

- Servidores Discord que precisam de **segurança enterprise**
- Administradores que querem **automação de moderação**
- Equipes de segurança que precisam de **incident response**
- Comunidades grandes (2.500+ membros) que precisam de **escalabilidade**

### 💡 O Que Você Vai Conseguir Fazer?

Depois de seguir este manual, você será capaz de:

1. ✅ Rodar o bot no seu computador (desenvolvimento)
2. ✅ Rodar o bot em produção (Docker)
3. ✅ Configurar detecção de ameaças
4. ✅ Conectar com MISP/OpenCTI
5. ✅ Adicionar novos comandos
6. ✅ Resolver problemas sozinho

---

## 2. PRÉ-REQUISITOS

### 🖥️ O Que Você Precisa Instalar ANTES

#### A. Node.js (Obrigatório)

**O que é?** Node.js é o "motor" que roda código JavaScript no servidor.

**Como instalar:**

##### 🐧 Linux (Ubuntu/Debian):
```bash
# 1. Atualizar repositórios
sudo apt update

# 2. Instalar Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verificar instalação
node --version   # Deve mostrar: v22.x.x
npm --version    # Deve mostrar: 10.x.x
```

##### 🍎 macOS:
```bash
# Instalar via Homebrew (se não tem Homebrew, instale primeiro: https://brew.sh)
brew install node@22

# Verificar instalação
node --version
npm --version
```

##### 🪟 Windows:
1. Baixe o instalador: https://nodejs.org/en/download/
2. Execute o instalador (clique em "Next" até o fim)
3. Abra o Prompt de Comando e verifique:
```cmd
node --version
npm --version
```

---

#### B. Docker (Opcional, mas Recomendado)

**O que é?** Docker é como uma "máquina virtual leve" que roda aplicações isoladas.

**Quando usar?** Para produção, ou se você quer rodar PostgreSQL/Redis localmente.

**Como instalar:**

##### 🐧 Linux:
```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Adicionar seu usuário ao grupo docker (para não precisar de sudo)
sudo usermod -aG docker $USER

# 3. Reiniciar sessão (logout e login novamente)

# 4. Instalar Docker Compose
sudo apt install docker-compose-plugin

# 5. Verificar instalação
docker --version
docker compose version
```

##### 🍎 macOS:
1. Baixe Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Instale o aplicativo
3. Abra Docker Desktop (deixe rodando)
4. Verifique no terminal:
```bash
docker --version
docker compose version
```

##### 🪟 Windows:
1. Baixe Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Instale o aplicativo
3. Abra Docker Desktop
4. Verifique no PowerShell:
```cmd
docker --version
docker compose version
```

---

#### C. Git (Obrigatório)

**O que é?** Git é a ferramenta de controle de versão de código.

**Como instalar:**

##### 🐧 Linux:
```bash
sudo apt install git
git --version
```

##### 🍎 macOS:
```bash
# Já vem instalado, mas pode atualizar:
brew install git
git --version
```

##### 🪟 Windows:
1. Baixe: https://git-scm.com/download/win
2. Instale com configurações padrão
3. Verifique:
```cmd
git --version
```

---

#### D. Editor de Código (Recomendado)

**Sugestão:** Visual Studio Code (VSCode)

**Download:** https://code.visualstudio.com/

**Por que?** Facilita editar arquivos `.env`, código TypeScript, etc.

---

### ✅ Checklist de Pré-Requisitos

Antes de continuar, verifique se você tem:

- [ ] Node.js 22.x instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Git instalado (`git --version`)
- [ ] Docker instalado (opcional, `docker --version`)
- [ ] Editor de código (VSCode recomendado)

---

## 3. CONFIGURAÇÃO INICIAL

### 📥 Passo 1: Clonar o Repositório

```bash
# 1. Abra o terminal (ou Prompt de Comando no Windows)

# 2. Navegue até a pasta onde quer salvar o projeto
cd ~/Documentos  # Exemplo: pasta Documentos

# 3. Clone o repositório
git clone https://github.com/JuanCS-Dev/Maximus-BOT.git

# 4. Entre na pasta do projeto
cd Maximus-BOT

# 5. Verifique se está na pasta certa
ls  # Linux/macOS
dir # Windows
# Você deve ver: src/, package.json, docker-compose.yml, etc.
```

---

### 📦 Passo 2: Instalar Dependências

```bash
# 1. Certifique-se de estar na pasta do projeto
pwd  # Linux/macOS (deve mostrar: .../Maximus-BOT)
cd   # Windows (deve mostrar: ...\Maximus-BOT)

# 2. Instalar todas as dependências
npm install

# 3. Aguarde... (pode levar 2-5 minutos)
# Você verá muitas mensagens aparecendo. Isso é normal.

# 4. Quando terminar, você deve ver:
# "added XXX packages"
```

**⚠️ Erros comuns:**
- `npm: command not found` → Você não instalou Node.js corretamente (volte ao Passo 2A)
- `permission denied` → Use `sudo npm install` (Linux/macOS) ou abra terminal como Admin (Windows)

---

### 🤖 Passo 3: Criar Bot no Discord Developer Portal

**Este é o passo mais importante. Siga com ATENÇÃO.**

#### 3.1. Acessar Discord Developer Portal

1. Abra seu navegador
2. Acesse: https://discord.com/developers/applications
3. Faça login com sua conta Discord

#### 3.2. Criar Nova Aplicação

1. Clique em **"New Application"** (canto superior direito)
2. Digite um nome: `Vértice Bot` (ou o nome que quiser)
3. Marque a caixa "I agree to the Terms of Service"
4. Clique em **"Create"**

#### 3.3. Obter o Application ID (CLIENT_ID)

1. Na página da aplicação, procure **"APPLICATION ID"**
2. Clique em **"Copy"** (ícone de copiar)
3. Cole em um bloco de notas temporariamente

#### 3.4. Criar o Bot

1. No menu lateral esquerdo, clique em **"Bot"**
2. Clique em **"Add Bot"** → **"Yes, do it!"**
3. Você verá a página do bot

#### 3.5. Obter o Token do Bot (DISCORD_TOKEN)

**⚠️ ATENÇÃO: O token é como uma senha. NUNCA compartilhe!**

1. Na seção **"TOKEN"**, clique em **"Reset Token"**
2. Confirme clicando em **"Yes, do it!"**
3. Copie o token que apareceu (começa com `MT` ou `Nz`)
4. **Cole em um bloco de notas** (você vai precisar depois)
5. **NUNCA compartilhe este token com ninguém!**

#### 3.6. Configurar Intents (MUITO IMPORTANTE)

**O que são Intents?** São "permissões" que o bot precisa para ler mensagens.

1. Na mesma página (Bot), role para baixo até **"Privileged Gateway Intents"**
2. **ATIVE as 3 opções:**
   - ✅ **PRESENCE INTENT** (opcional, mas recomendado)
   - ✅ **SERVER MEMBERS INTENT** (obrigatório)
   - ✅ **MESSAGE CONTENT INTENT** (obrigatório)
3. Clique em **"Save Changes"** (canto inferior)

**⚠️ SEM MESSAGE CONTENT INTENT, O BOT NÃO FUNCIONA!**

#### 3.7. Convidar Bot para Seu Servidor

1. No menu lateral, clique em **"OAuth2"** → **"URL Generator"**
2. Em **"SCOPES"**, marque:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Em **"BOT PERMISSIONS"**, marque:
   - ✅ `Administrator` (mais fácil) OU selecione manualmente:
     - ✅ `Manage Messages`
     - ✅ `Manage Roles`
     - ✅ `Manage Channels`
     - ✅ `Kick Members`
     - ✅ `Ban Members`
     - ✅ `Read Message History`
     - ✅ `Send Messages`
     - ✅ `Embed Links`
     - ✅ `Attach Files`
     - ✅ `Moderate Members` (para timeout)
4. Role para baixo e copie a **"GENERATED URL"**
5. Cole a URL no navegador
6. Selecione o servidor onde quer adicionar o bot
7. Clique em **"Authorize"** (Autorizar)
8. Complete o CAPTCHA

**✅ Pronto! O bot agora está no seu servidor (mas ainda offline).**

---

### 🔑 Passo 4: Configurar Variáveis de Ambiente (.env)

**O que é .env?** É um arquivo secreto onde você guarda tokens, senhas, URLs, etc.

#### 4.1. Criar Arquivo .env

```bash
# 1. Na pasta do projeto, copie o exemplo
cp .env.example .env

# 2. Abra o arquivo .env no editor
# VSCode:
code .env

# Ou qualquer editor de texto:
nano .env  # Linux
notepad .env  # Windows
```

#### 4.2. Preencher Variáveis OBRIGATÓRIAS

Edite o arquivo `.env` e preencha:

```bash
# ========================================
# OBRIGATÓRIO - Não funciona sem isso!
# ========================================

# Node Environment (desenvolvimento ou produção)
NODE_ENV=development

# Discord Bot Token (copiado no Passo 3.5)
DISCORD_TOKEN=SEU_TOKEN_AQUI

# Discord Application ID (copiado no Passo 3.3)
CLIENT_ID=SEU_CLIENT_ID_AQUI

# Discord Guild ID (ID do seu servidor)
# Como obter: Discord → Configurações → Avançado → Ativar "Modo Desenvolvedor"
# Depois: Clique com botão direito no seu servidor → "Copiar ID do Servidor"
GUILD_ID=SEU_GUILD_ID_AQUI

# Logging Level (debug = mais detalhado, info = normal, error = só erros)
LOG_LEVEL=debug

# ========================================
# BANCO DE DADOS (PostgreSQL)
# ========================================

# Para desenvolvimento local (se usar Docker):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vertice_bot

# Para produção (substitua com suas credenciais):
# DATABASE_URL=postgresql://usuario:senha@host:5432/banco

# ========================================
# CACHE (Redis)
# ========================================

# Para desenvolvimento local (se usar Docker):
REDIS_URL=redis://localhost:6379

# Para produção (substitua com suas credenciais):
# REDIS_URL=redis://usuario:senha@host:6379

# ========================================
# DETECÇÃO DE AMEAÇAS
# ========================================

# Score mínimo para tomar ação (0-100)
# 80 = apenas ameaças críticas
# 50 = ameaças médias e críticas
THREAT_SCORE_THRESHOLD=80

# Google Safe Browsing API (OPCIONAL - melhora detecção)
# Obter em: https://console.cloud.google.com/apis/credentials
GOOGLE_SAFE_BROWSING_API_KEY=

# VirusTotal API (OPCIONAL - melhora detecção)
# Obter em: https://www.virustotal.com/gui/my-apikey
VIRUSTOTAL_API_KEY=

# ========================================
# MISP (OPCIONAL - Threat Intelligence)
# ========================================

MISP_ENABLED=false
MISP_URL=
MISP_API_KEY=

# ========================================
# OpenCTI (OPCIONAL - Threat Intelligence)
# ========================================

OPENCTI_ENABLED=false
OPENCTI_URL=
OPENCTI_API_KEY=

# ========================================
# Vértice-MAXIMUS (OPCIONAL)
# ========================================

VERTICE_MAXIMUS_ENABLED=false
VERTICE_MAXIMUS_URL=
VERTICE_MAXIMUS_API_KEY=

# ========================================
# ESCALABILIDADE (OPCIONAL)
# ========================================

# Número de shards (auto = calcula automaticamente)
SHARD_COUNT=auto

# Métricas Prometheus
METRICS_ENABLED=true
METRICS_PORT=9090
```

#### 4.3. Exemplo de .env Mínimo Funcional

Se você quer apenas **testar o bot SEM Docker**, use:

```bash
NODE_ENV=development
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.ABCDEF.xyzXYZ123456789
CLIENT_ID=1234567890123456789
GUILD_ID=9876543210987654321
LOG_LEVEL=debug
THREAT_SCORE_THRESHOLD=80

# Banco de dados e Redis são opcionais para teste rápido
# O bot vai funcionar, mas sem persistência
DATABASE_URL=
REDIS_URL=
```

**⚠️ Salve o arquivo e feche!**

---

### 🗄️ Passo 5: Configurar Banco de Dados (Prisma)

#### 5.1. Opção A: Usar Docker (Recomendado)

```bash
# 1. Iniciar PostgreSQL e Redis via Docker
docker compose up -d postgres redis

# 2. Aguardar 10 segundos para os serviços iniciarem
sleep 10

# 3. Gerar Prisma Client
npm run prisma:generate

# 4. Rodar migrations (criar tabelas)
npm run prisma:push

# 5. Verificar se funcionou
docker compose ps
# Deve mostrar postgres e redis como "running"
```

#### 5.2. Opção B: Usar Banco de Dados Externo

Se você tem PostgreSQL e Redis já instalados OU usa um serviço na nuvem:

```bash
# 1. Configure DATABASE_URL e REDIS_URL no .env com suas credenciais

# 2. Gerar Prisma Client
npm run prisma:generate

# 3. Rodar migrations
npm run prisma:push
```

#### 5.3. Opção C: Testar Sem Banco de Dados

**⚠️ Não recomendado para produção, mas funciona para testar:**

```bash
# Apenas gere o cliente (mesmo sem banco)
npm run prisma:generate

# O bot vai rodar, mas sem salvar dados
```

---

### ✅ Checklist de Configuração Inicial

Antes de prosseguir, verifique:

- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Bot criado no Discord Developer Portal
- [ ] Token do bot copiado
- [ ] Intents ativados (MESSAGE CONTENT INTENT)
- [ ] Bot adicionado ao servidor
- [ ] Arquivo `.env` criado e preenchido
- [ ] Prisma Client gerado
- [ ] Banco de dados configurado (ou pulado para teste)

**✅ Se tudo está OK, prossiga para rodar o bot!**

---

## 4. COMO RODAR O BOT (MODO DESENVOLVIMENTO)

### 🚀 Rodando pela Primeira Vez

```bash
# 1. Certifique-se de estar na pasta do projeto
cd /caminho/para/Maximus-BOT

# 2. Iniciar o bot em modo desenvolvimento (com auto-reload)
npm run dev

# 3. Você deve ver:
# [INFO] 🤖 Vértice Bot está online!
# [INFO] ✅ Comandos registrados no servidor!
# [INFO] 🟢 Conectado como: SeuBot#1234
```

### ✅ Como Saber Se Funcionou?

1. **No terminal**, você deve ver:
   ```
   [INFO] 🤖 Vértice Bot está online!
   ```

2. **No Discord**, o bot deve aparecer **online** (bolinha verde) na lista de membros

3. **Teste um comando**:
   - No Discord, digite: `/ping`
   - O bot deve responder: "Pong! 🏓"

### 🛑 Como Parar o Bot?

No terminal, pressione: `Ctrl + C`

### 🔄 Como Reiniciar o Bot?

```bash
# Parar (Ctrl + C) e rodar novamente:
npm run dev
```

---

## 5. COMO RODAR O BOT (MODO PRODUÇÃO COM DOCKER)

### 🐳 Por Que Usar Docker?

- ✅ **Isolamento**: Bot roda em container separado
- ✅ **Facilidade**: Todos os serviços (bot, banco, Redis, MISP) em um comando
- ✅ **Escalabilidade**: Fácil de replicar em servidores
- ✅ **Produção**: Recomendado para ambientes reais

### 📦 Passo 1: Buildar o Projeto

```bash
# 1. Compilar TypeScript para JavaScript
npm run build

# 2. Verificar se criou a pasta dist/
ls dist/  # Linux/macOS
dir dist\ # Windows
```

### 🚀 Passo 2: Iniciar Todos os Serviços

```bash
# 1. Iniciar TUDO (bot, PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# 2. Aguardar 30 segundos (primeira vez demora mais)

# 3. Verificar status
docker compose ps

# Você deve ver todos os serviços como "running":
# - vertice-bot
# - postgres
# - redis
# - prometheus
# - grafana
```

### 📊 Passo 3: Acessar Interfaces Web

Depois de iniciar, você pode acessar:

- **Grafana (Dashboards):** http://localhost:3000
  - Usuário: `admin`
  - Senha: `admin` (mude na primeira vez)

- **Prometheus (Métricas):** http://localhost:9090

- **Bot Metrics Endpoint:** http://localhost:9090/metrics

### 📝 Passo 4: Ver Logs do Bot

```bash
# Ver logs em tempo real
docker compose logs -f bot

# Ver últimas 100 linhas
docker compose logs --tail=100 bot

# Ver logs de todos os serviços
docker compose logs -f
```

### 🛑 Passo 5: Parar os Serviços

```bash
# Parar tudo (mas manter dados)
docker compose stop

# Parar e REMOVER containers (dados ficam salvos)
docker compose down

# Parar e REMOVER TUDO (incluindo volumes - CUIDADO!)
docker compose down -v
```

### 🔄 Passo 6: Reiniciar Após Mudanças no Código

```bash
# 1. Parar containers
docker compose down

# 2. Recompilar TypeScript
npm run build

# 3. Rebuild da imagem Docker
docker compose build bot

# 4. Iniciar novamente
docker compose up -d

# 5. Ver logs
docker compose logs -f bot
```

---

## 6. CONFIGURANDO INTEGRAÇÕES EXTERNAS

### 🔐 Google Safe Browsing (Detecção de URLs Maliciosas)

**Por que usar?** Melhora MUITO a detecção de phishing e malware.

#### Passo 1: Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto (ex: `vertice-bot`)
3. Ative a API: https://console.cloud.google.com/apis/library/safebrowsing.googleapis.com
4. Clique em **"Enable"** (Ativar)

#### Passo 2: Criar API Key

1. Vá para: https://console.cloud.google.com/apis/credentials
2. Clique em **"Create Credentials"** → **"API Key"**
3. Copie a chave que apareceu
4. (Opcional) Clique em **"Restrict Key"** e limite para Safe Browsing API

#### Passo 3: Adicionar no .env

```bash
GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyAbc123def456ghi789jklMNO012pqrSTU
```

**✅ Pronto! Reinicie o bot.**

---

### 🦠 VirusTotal (Análise de Malware)

**Por que usar?** Verifica arquivos e URLs contra 70+ antivírus.

#### Passo 1: Criar Conta

1. Acesse: https://www.virustotal.com/
2. Crie uma conta gratuita (Sign Up)
3. Confirme o email

#### Passo 2: Obter API Key

1. Faça login
2. Vá para: https://www.virustotal.com/gui/my-apikey
3. Copie a API Key

#### Passo 3: Adicionar no .env

```bash
VIRUSTOTAL_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

**✅ Pronto! Reinicie o bot.**

---

### 🔍 MISP (Threat Intelligence Platform)

**O que é?** Plataforma open-source para compartilhar inteligência de ameaças.

**Quando usar?** Se você tem uma instância MISP ou usa um serviço público.

#### Opção A: Usar MISP via Docker (Local)

```bash
# 1. Iniciar MISP no Docker Compose
docker compose up -d misp

# 2. Aguardar 2-3 minutos (primeira vez é lenta)

# 3. Acessar MISP Web UI
# URL: https://localhost:443
# Usuário: admin@admin.test
# Senha: admin (mude depois)

# 4. Criar API Key no MISP
# MISP Web → Administration → List Users → admin → Auth Keys → Add

# 5. Copiar a API Key e adicionar no .env
```

#### Opção B: Usar MISP Externo

```bash
# Adicione no .env:
MISP_ENABLED=true
MISP_URL=https://misp.example.com
MISP_API_KEY=sua_api_key_aqui
```

**✅ Pronto! Reinicie o bot.**

---

### 🌐 OpenCTI (Cyber Threat Intelligence)

**O que é?** Plataforma de inteligência de ameaças com grafos.

**Quando usar?** Para análise avançada de campanhas de ameaças.

#### Opção A: Usar OpenCTI via Docker (Local)

```bash
# 1. Iniciar OpenCTI no Docker Compose
docker compose up -d opencti

# 2. Aguardar 5 minutos (primeira vez é MUITO lenta)

# 3. Acessar OpenCTI Web UI
# URL: http://localhost:8080
# Usuário: admin@opencti.io
# Senha: admin (mude depois)

# 4. Criar API Token no OpenCTI
# OpenCTI → Profile (canto superior direito) → API Access → Create token

# 5. Copiar o token e adicionar no .env
```

#### Opção B: Usar OpenCTI Externo

```bash
# Adicione no .env:
OPENCTI_ENABLED=true
OPENCTI_URL=https://opencti.example.com
OPENCTI_API_KEY=seu_token_aqui
```

**✅ Pronto! Reinicie o bot.**

---

### 📊 Prometheus + Grafana (Monitoramento)

**Já vem configurado no Docker Compose!**

#### Acessar Grafana

1. URL: http://localhost:3000
2. Usuário: `admin`
3. Senha: `admin` (mude na primeira vez)

#### Importar Dashboard Pré-Configurado

1. No Grafana, vá em: **Dashboards** → **Import**
2. Cole o ID: `1860` (Node Exporter Full)
3. Clique em **Load** → **Import**

#### Criar Dashboard Customizado

1. **Dashboards** → **New Dashboard** → **Add Visualization**
2. Selecione **Prometheus** como data source
3. Query de exemplo:
   ```promql
   # Total de ameaças detectadas
   sum(threat_detections_total)

   # Taxa de detecção por minuto
   rate(threat_detections_total[1m])

   # Servidores ativos
   discord_guilds_total
   ```

---

## 7. COMANDOS DISPONÍVEIS NO DISCORD

### 🔧 Comandos de Administração

#### `/ban`
**Descrição:** Bane um usuário do servidor

**Uso:**
```
/ban user:@Usuario reason:Spam messages:7days
```

**Parâmetros:**
- `user`: Usuário a ser banido (obrigatório)
- `reason`: Motivo do ban (opcional)
- `messages`: Deletar mensagens (opções: 1hour, 6hours, 12hours, 1day, 3days, 7days)

**Permissões necessárias:** `BAN_MEMBERS`

---

#### `/incident`
**Descrição:** Gerenciar casos de resposta a incidentes

**Uso:**
```
/incident create type:phishing severity:high description:Ataque de phishing detectado
/incident list
/incident close case_id:INC-1234
```

**Subcomandos:**
- `create`: Criar novo caso
  - `type`: Tipo do incidente (phishing, malware, spam, raid, other)
  - `severity`: Severidade (low, medium, high, critical)
  - `description`: Descrição detalhada
- `list`: Listar casos abertos
- `close`: Fechar um caso
  - `case_id`: ID do caso (ex: INC-1234)
  - `resolution`: Resumo da resolução

**Permissões necessárias:** `ADMINISTRATOR` ou `MODERATE_MEMBERS`

---

#### `/automod`
**Descrição:** Configurar regras de auto-moderação

**Uso:**
```
/automod create name:Anti-Spam action:timeout enabled:true
/automod list
/automod delete rule_id:123
```

**Subcomandos:**
- `create`: Criar nova regra
- `list`: Listar regras ativas
- `delete`: Deletar uma regra
- `toggle`: Ativar/desativar uma regra

---

### 🔍 Comandos de Segurança

#### `/scan`
**Descrição:** Escanear URL ou arquivo manualmente

**Uso:**
```
/scan url:https://example.com/suspicious
/scan file:[anexo]
```

**O bot vai:**
1. Analisar a URL/arquivo
2. Consultar Google Safe Browsing, VirusTotal, MISP
3. Retornar relatório de ameaças

---

#### `/threatinfo`
**Descrição:** Ver informações sobre detecções recentes

**Uso:**
```
/threatinfo
/threatinfo user:@Usuario
```

**Mostra:**
- Total de ameaças detectadas (últimas 24h)
- Tipos de ameaças
- Ações tomadas
- Score médio

---

### 📊 Comandos de Estatísticas

#### `/stats`
**Descrição:** Estatísticas do servidor

**Uso:**
```
/stats
```

**Mostra:**
- Total de membros
- Ameaças detectadas (hoje)
- Casos abertos
- Uptime do bot

---

#### `/audit`
**Descrição:** Ver audit log de ações de moderação

**Uso:**
```
/audit
/audit user:@Usuario
/audit action:ban
```

**Filtros:**
- `user`: Ver ações de um moderador específico
- `action`: Filtrar por tipo (ban, kick, timeout, delete)
- `limit`: Número de registros (padrão: 10)

---

### 🛠️ Comandos de Utilidade

#### `/ping`
**Descrição:** Testar latência do bot

**Uso:**
```
/ping
```

**Retorna:**
- Latency: tempo de resposta em ms
- API Latency: latência da API do Discord

---

#### `/help`
**Descrição:** Listar todos os comandos disponíveis

**Uso:**
```
/help
/help command:ban
```

---

## 8. TROUBLESHOOTING

### ❌ Problema: "npm: command not found"

**Causa:** Node.js não está instalado ou não está no PATH.

**Solução:**
```bash
# Verificar se Node.js está instalado
node --version

# Se não retornar versão, reinstale Node.js (volte ao Passo 2A)
```

---

### ❌ Problema: "Error: Incorrect login details were provided"

**Causa:** Token do Discord inválido ou expirado.

**Solução:**
1. Volte ao Discord Developer Portal
2. Vá em Bot → Reset Token
3. Copie o novo token
4. Atualize `.env` com o novo `DISCORD_TOKEN`
5. Reinicie o bot

---

### ❌ Problema: "Missing Access" ou "Missing Permissions"

**Causa:** Bot não tem permissões suficientes no servidor.

**Solução:**
1. No Discord, vá em: **Configurações do Servidor** → **Roles** (Cargos)
2. Encontre o cargo do bot
3. Ative as permissões:
   - ✅ Administrator (mais fácil) OU
   - ✅ Manage Messages, Manage Roles, Ban Members, Kick Members, Moderate Members

---

### ❌ Problema: "Disallowed Intents: MESSAGE_CONTENT"

**Causa:** MESSAGE CONTENT INTENT não está ativado.

**Solução:**
1. Discord Developer Portal → Seu App → Bot
2. Role até "Privileged Gateway Intents"
3. ✅ Ative **MESSAGE CONTENT INTENT**
4. Clique em **Save Changes**
5. Reinicie o bot

**⚠️ Se não aparecer a opção:** Seu bot está em mais de 100 servidores. Você precisa verificar a aplicação (processo mais complexo).

---

### ❌ Problema: "Cannot find module './commands/xxx'"

**Causa:** Você não compilou o TypeScript para JavaScript.

**Solução:**
```bash
# Compilar projeto
npm run build

# Verificar se criou a pasta dist/
ls dist/

# Rodar novamente
npm start
```

---

### ❌ Problema: "ECONNREFUSED" ao conectar no banco de dados

**Causa:** PostgreSQL não está rodando.

**Solução:**

#### Se usando Docker:
```bash
# Verificar se PostgreSQL está rodando
docker compose ps

# Se não estiver, iniciar
docker compose up -d postgres

# Ver logs
docker compose logs postgres
```

#### Se usando PostgreSQL externo:
```bash
# Verificar se está rodando
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Iniciar se necessário
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS
```

---

### ❌ Problema: "Redis connection refused"

**Causa:** Redis não está rodando.

**Solução:**
```bash
# Se usando Docker:
docker compose up -d redis

# Se usando Redis externo:
sudo systemctl start redis  # Linux
brew services start redis  # macOS
```

**Alternativa:** Desabilitar Redis temporariamente (edite `.env`):
```bash
REDIS_URL=
```

---

### ❌ Problema: Bot fica offline imediatamente

**Causa:** Erro fatal no código.

**Solução:**
```bash
# Ver logs detalhados
npm run dev

# Procure por erros em vermelho (red text)
# Leia a mensagem de erro e procure neste manual

# Se não encontrar solução, abra uma issue no GitHub:
# https://github.com/JuanCS-Dev/Maximus-BOT/issues
```

---

### ❌ Problema: "Prisma Client not generated"

**Causa:** Prisma Client não foi gerado.

**Solução:**
```bash
# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:push

# Reiniciar bot
npm run dev
```

---

### ❌ Problema: Comandos não aparecem no Discord

**Causa:** Comandos não foram registrados.

**Solução:**
```bash
# 1. Verificar se GUILD_ID está correto no .env
# 2. Parar o bot (Ctrl + C)
# 3. Deletar comandos antigos (se houver):
npm run commands:clear

# 4. Reiniciar bot (vai re-registrar automaticamente)
npm run dev

# 5. Aguardar 1 minuto
# 6. No Discord, digite "/" e veja se os comandos aparecem
```

**Se ainda não aparecer:**
```bash
# Registrar comandos globalmente (leva até 1 hora)
# Remova GUILD_ID do .env temporariamente
# Reinicie o bot
```

---

### 🆘 Ainda Não Funciona?

1. **Verifique os logs:**
   ```bash
   npm run dev 2>&1 | tee bot.log
   # Salva logs em bot.log
   ```

2. **Abra uma issue no GitHub:**
   - URL: https://github.com/JuanCS-Dev/Maximus-BOT/issues
   - Inclua:
     - Descrição do problema
     - Logs de erro (sem o token!)
     - Sistema operacional
     - Versão do Node.js (`node --version`)

3. **Pergunte na comunidade:**
   - Discord do projeto (se houver)
   - Stack Overflow (tag: discord.js)

---

## 9. COMO ADICIONAR NOVOS COMANDOS

### 📝 Estrutura de um Comando

Todos os comandos ficam em: `src/commands/`

**Exemplo: Criar comando `/kick`**

```typescript
// src/commands/kick.ts

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CommandType } from '../types';

const kick: CommandType = {
  // Definição do comando (nome, descrição, opções)
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um usuário do servidor')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Usuário a ser expulso')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Motivo da expulsão')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  // Lógica de execução
  async execute(interaction) {
    try {
      // 1. Obter parâmetros
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason') || 'Sem motivo especificado';

      // 2. Obter membro do servidor
      const member = await interaction.guild?.members.fetch(targetUser.id);

      if (!member) {
        return interaction.reply({
          content: '❌ Usuário não encontrado no servidor.',
          ephemeral: true,
        });
      }

      // 3. Verificar se pode expulsar
      if (!member.kickable) {
        return interaction.reply({
          content: '❌ Não posso expulsar este usuário (hierarquia ou permissões).',
          ephemeral: true,
        });
      }

      // 4. Executar kick
      await member.kick(reason);

      // 5. Responder sucesso
      await interaction.reply({
        content: `✅ ${targetUser.tag} foi expulso.\n**Motivo:** ${reason}`,
      });

    } catch (error) {
      console.error('Erro ao executar /kick:', error);
      await interaction.reply({
        content: '❌ Erro ao expulsar usuário.',
        ephemeral: true,
      });
    }
  },
};

export default kick;
```

### 🔄 Passos para Adicionar o Comando

1. **Criar arquivo:** `src/commands/kick.ts` (copie o código acima)
2. **Salvar o arquivo**
3. **Recompilar:**
   ```bash
   npm run build
   ```
4. **Reiniciar bot:**
   ```bash
   npm run dev
   ```
5. **Testar no Discord:** `/kick @Usuario reason:Spam`

**✅ O comando é registrado automaticamente!**

---

### 📚 Recursos para Aprender Mais

- **Discord.js Docs:** https://discord.js.org/docs
- **Discord.js Guide:** https://discordjs.guide/
- **Slash Commands Guide:** https://discordjs.guide/creating-your-bot/slash-commands.html

---

## 10. PERGUNTAS FREQUENTES (FAQ)

### ❓ Preciso pagar para usar o bot?

**Resposta:** Não! O bot é 100% open-source e gratuito. Você só precisa de:
- Um servidor para rodar (pode ser seu próprio PC)
- APIs externas (Google Safe Browsing, VirusTotal) têm planos gratuitos

---

### ❓ Quantos servidores o bot suporta?

**Resposta:**
- **Modo normal:** Até 2.500 servidores
- **Modo sharding:** Ilimitado (configurável)

---

### ❓ O bot funciona no Windows?

**Resposta:** Sim! Funciona em:
- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, Fedora, etc.)
- ✅ macOS (Intel e Apple Silicon)

---

### ❓ Posso hospedar o bot na nuvem?

**Resposta:** Sim! Funciona em:
- ✅ Google Cloud Run
- ✅ AWS (EC2, ECS, Lambda)
- ✅ Azure (Container Instances)
- ✅ DigitalOcean (Droplets)
- ✅ Heroku (com Dockerfile)
- ✅ VPS qualquer (com Docker)

---

### ❓ O bot coleta dados dos usuários?

**Resposta:**
- **Dados armazenados:** IDs de usuários/mensagens (para auditoria)
- **Dados NÃO armazenados:** Conteúdo de mensagens (apenas IOCs)
- **LGPD/GDPR:** Compliant (você controla os dados)

---

### ❓ Como atualizar o bot quando houver nova versão?

```bash
# 1. Parar o bot
docker compose down  # se usando Docker
# OU Ctrl+C se rodando npm run dev

# 2. Atualizar código
git pull origin main

# 3. Instalar novas dependências
npm install

# 4. Recompilar
npm run build

# 5. Rodar migrations (se houver)
npm run prisma:migrate:deploy

# 6. Reiniciar
docker compose up -d  # Docker
# OU npm run dev
```

---

### ❓ Posso modificar o código?

**Resposta:** Sim! Licença MIT permite:
- ✅ Uso comercial
- ✅ Modificação
- ✅ Distribuição
- ✅ Uso privado

**Apenas mantenha a licença e créditos originais.**

---

### ❓ O bot detecta 100% das ameaças?

**Resposta:** Não. Nenhum sistema é 100% eficaz. O bot usa múltiplas camadas:
- Google Safe Browsing (~95% de URLs maliciosas)
- VirusTotal (~90% de malware conhecido)
- Pattern matching (~70% de conteúdo suspeito)
- MISP/OpenCTI (depende da base de dados)

**Sempre combine com moderação humana!**

---

### ❓ Como reportar bugs ou pedir features?

1. **GitHub Issues:** https://github.com/JuanCS-Dev/Maximus-BOT/issues
2. **Pull Requests:** Contribuições são bem-vindas!
3. **Discord:** (se houver servidor oficial)

---

## 11. GLOSSÁRIO

### 🔤 Termos Técnicos Explicados

**API (Application Programming Interface)**
→ Forma de um software conversar com outro. Ex: Bot conversa com Discord via API.

**Bot**
→ Programa automatizado que responde a comandos no Discord.

**Container (Docker)**
→ Como uma "caixa virtual" que roda aplicações isoladas.

**Docker Compose**
→ Ferramenta para rodar múltiplos containers juntos (bot + banco + Redis).

**Environment Variables (.env)**
→ Arquivo secreto com senhas, tokens, URLs.

**Intent (Discord)**
→ "Permissão" que o bot precisa para acessar dados (ex: ler mensagens).

**IOC (Indicator of Compromise)**
→ Sinal de ameaça: URL suspeita, hash de malware, IP malicioso.

**MISP (Malware Information Sharing Platform)**
→ Plataforma para compartilhar inteligência de ameaças.

**OpenCTI (Open Cyber Threat Intelligence)**
→ Plataforma de inteligência de ameaças com grafos.

**Prisma**
→ ORM (mapeador de banco de dados) que facilita trabalhar com PostgreSQL.

**PostgreSQL**
→ Banco de dados relacional (armazena usuários, ameaças, audit logs).

**Prometheus**
→ Sistema de monitoramento que coleta métricas do bot.

**Redis**
→ Banco de dados em memória (rápido) usado para cache e rate limiting.

**Sharding**
→ Dividir o bot em múltiplas instâncias para escalar (2.500+ servidores).

**Slash Command (/comando)**
→ Comando nativo do Discord (aparece com "/" e tem autocomplete).

**STIX (Structured Threat Information eXpression)**
→ Padrão para representar ameaças cibernéticas.

**TAXII (Trusted Automated eXchange of Indicator Information)**
→ Protocolo para trocar informações de ameaças.

**Threat Intelligence**
→ Inteligência sobre ameaças cibernéticas (quem ataca, como, quando).

**Token (Discord)**
→ "Senha" do bot para se conectar ao Discord. NUNCA compartilhe!

**TypeScript**
→ JavaScript com tipos (detecta erros antes de rodar).

**Vértice-MAXIMUS**
→ Ecossistema de segurança cibernética (integração opcional).

**VirusTotal**
→ Serviço que analisa arquivos/URLs com 70+ antivírus.

**Webhook**
→ URL que recebe notificações (ex: alertas de ameaças).

---

## 🎉 CONCLUSÃO

Parabéns! Se você chegou até aqui, você agora é capaz de:

✅ Instalar e configurar o bot
✅ Rodar em desenvolvimento e produção
✅ Configurar integrações externas
✅ Adicionar novos comandos
✅ Resolver problemas comuns
✅ Monitorar o bot com Grafana

### 🚀 Próximos Passos

1. **Teste o bot** no seu servidor Discord
2. **Configure alertas** para seu canal de moderação
3. **Adicione APIs** (Google Safe Browsing, VirusTotal)
4. **Customize comandos** para suas necessidades
5. **Deploy em produção** (VPS ou cloud)
6. **Monitore métricas** com Grafana

### 📖 Documentação Adicional

- **README.md** - Visão geral do projeto
- **VALIDATION_CERTIFICATE.md** - Certificado de validação E2E
- **PROJECT_COMPLETE.md** - Documentação técnica completa
- **MASTER_PLAN.md** - Plano de implementação por fases

### 🤝 Contribua!

Este projeto é open-source. Contribuições são bem-vindas:
- 🐛 Reporte bugs
- 💡 Sugira features
- 🔧 Envie pull requests
- 📖 Melhore a documentação

**GitHub:** https://github.com/JuanCS-Dev/Maximus-BOT

---

**Desenvolvido com ❤️ para o Sistema Vértice**
**Última atualização:** 2025-10-29

---

## 📞 SUPORTE

**Encontrou um problema não listado aqui?**

1. ✅ Revise este manual novamente (Ctrl+F para buscar)
2. ✅ Verifique os logs de erro
3. ✅ Abra uma issue no GitHub
4. ✅ Pergunte na comunidade Discord (se disponível)

**Lembre-se:** Não compartilhe seu token do Discord em NENHUMA circunstância!

---

**FIM DO MANUAL ANTIBURRO** 🎯
