# 🤖 Vértice Discord Bot
## Enterprise-Grade Security & Threat Intelligence Platform

> **Sistema completo de segurança cibernética para Discord com detecção de ameaças em tempo real, resposta a incidentes automatizada e integração com plataformas de Threat Intelligence.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.16-5865F2.svg)](https://discord.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Validation](https://img.shields.io/badge/E2E%20Validation-PASSED-brightgreen.svg)](VALIDATION_CERTIFICATE.md)

---

## 📋 ÍNDICE

- [Visão Geral](#-visão-geral)
- [Features Principais](#-features-principais)
- [Quick Start](#-quick-start)
- [Documentação](#-documentação)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Comandos Discord](#-comandos-discord)
- [Deploy](#-deploy)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 VISÃO GERAL

O **Vértice Discord Bot** é uma plataforma enterprise de segurança cibernética para Discord que oferece:

- 🔍 **Detecção de Ameaças em Tempo Real** - Análise automática de mensagens, URLs e arquivos
- 🛡️ **Auto-Moderação Inteligente** - Proteção contra spam, raids e conteúdo malicioso
- 🚨 **Resposta a Incidentes** - Sistema completo de incident response com playbooks automatizados
- 🌐 **Threat Intelligence** - Integração com MISP, OpenCTI e Vértice-MAXIMUS
- 📊 **Observabilidade** - Métricas Prometheus e dashboards Grafana
- 🔗 **Escalabilidade Enterprise** - Suporte para 2.500+ servidores via sharding

### 🎖️ Status de Validação

✅ **E2E VALIDATION PASSED** (2025-10-29)
- 0 TypeScript Errors
- 0 ESLint Errors
- 0 Security Vulnerabilities
- 100% Implementation Complete

Ver: [VALIDATION_CERTIFICATE.md](VALIDATION_CERTIFICATE.md)

---

## ✨ FEATURES PRINCIPAIS

### 🛡️ Segurança & Moderação

| Feature | Status | Descrição |
|---------|--------|-----------|
| **Auto-Moderação** | ✅ | Filtros de conteúdo, anti-spam, anti-raid |
| **Rate Limiting** | ✅ | Proteção contra abuso de comandos (Redis) |
| **Permission Management** | ✅ | Controle de acesso baseado em roles |
| **Audit Logging** | ✅ | Registro completo de ações de moderação |
| **User Moderation** | ✅ | Ban, kick, timeout, warnings |

### 🔍 Threat Intelligence

| Feature | Status | Descrição |
|---------|--------|-----------|
| **MISP Integration** | ✅ | Query de eventos, sighting reports, criação de eventos |
| **OpenCTI Integration** | ✅ | Query de indicadores, coleções TAXII 2.1 |
| **Google Safe Browsing** | ✅ | Detecção de URLs maliciosas (v4 API) |
| **VirusTotal** | ✅ | Análise de arquivos e URLs (v3 API) |
| **IOC Extraction** | ✅ | Extração automática de URLs, IPs, domínios, hashes |
| **Threat Scoring** | ✅ | Sistema de pontuação 0-100 com ações automatizadas |

### 🚨 Incident Response

| Feature | Status | Descrição |
|---------|--------|-----------|
| **Interactive Alerts** | ✅ | Alertas com botões Discord (Ban/Timeout/Delete/Ignore) |
| **Case Management** | ✅ | Criação, tracking e fechamento de casos |
| **Automated Playbooks** | ✅ | Checklists por tipo de incidente (phishing, malware, spam, raid) |
| **Private IR Channels** | ✅ | Criação automática de canais de investigação |
| **Chain of Custody** | ✅ | Hashing SHA-256 para integridade forense |
| **Timeline Logging** | ✅ | Timeline imutável de eventos |

### 🚀 Enterprise Features

| Feature | Status | Descrição |
|---------|--------|-----------|
| **Discord Sharding** | ✅ | Escalabilidade para 2.500+ guilds |
| **Prometheus Metrics** | ✅ | Exportação de métricas customizadas |
| **Grafana Dashboards** | ✅ | Visualização em tempo real |
| **Docker Support** | ✅ | Full containerization (bot + infra) |
| **High Availability** | ✅ | Auto-restart, graceful shutdown |
| **Multi-Shard Support** | ✅ | Distribuição automática de carga |

---

## 🚀 QUICK START

### Pré-Requisitos

- **Node.js** 22.x LTS ([Download](https://nodejs.org/))
- **Docker** 20.x+ & Docker Compose 2.x+ ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))
- **Discord Bot Token** ([Criar bot](https://discord.com/developers/applications))

### Instalação Rápida (5 minutos)

```bash
# 1. Clonar repositório
git clone https://github.com/JuanCS-Dev/Maximus-BOT.git
cd Maximus-BOT

# 2. Instalar dependências
npm install

# 3. Configurar environment
cp .env.example .env
# Edite .env com seu DISCORD_TOKEN, CLIENT_ID, GUILD_ID

# 4. Gerar Prisma Client
npm run prisma:generate

# 5. Rodar em desenvolvimento
npm run dev
```

### Rodando com Docker (Produção)

```bash
# 1. Build do projeto
npm run build

# 2. Iniciar todos os serviços
docker compose up -d

# 3. Ver logs
docker compose logs -f bot

# 4. Acessar interfaces
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# Metrics: http://localhost:9090/metrics
```

---

## 📖 DOCUMENTAÇÃO

### 📚 Manuais Disponíveis

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| **[ANTIBURRO.md](ANTIBURRO.md)** | Manual completo do zero ao deploy | Primeira instalação |
| **[VALIDATION_CERTIFICATE.md](VALIDATION_CERTIFICATE.md)** | Certificado de validação E2E | Verificar status de produção |
| **[PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)** | Documentação técnica completa (4.600+ linhas) | Desenvolvimento e integração |
| **[MASTER_PLAN.md](MASTER_PLAN.md)** | Plano de implementação por fases | Roadmap e histórico |

### 🎯 Por Onde Começar?

1. **Nunca usou o bot?** → Leia **[ANTIBURRO.md](ANTIBURRO.md)**
2. **Quer entender a arquitetura?** → Leia **[PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)**
3. **Precisa fazer deploy?** → Siga seção [Deploy](#-deploy) abaixo
4. **Quer contribuir?** → Leia [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🏗️ ARQUITETURA

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     DISCORD ECOSYSTEM                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Guild 1    │  │   Guild 2    │  │  Guild 2500+ │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │   DISCORD SHARDING MANAGER          │
          │   (Shard 0, Shard 1, ..., Shard N) │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────────────────┐
          │          VÉRTICE DISCORD BOT CORE               │
          │  ┌────────────────────────────────────────┐    │
          │  │  Inversify Dependency Injection        │    │
          │  │  Container (Singleton Services)        │    │
          │  └────────────────────────────────────────┘    │
          │                                                  │
          │  ┌──────────────────┐ ┌──────────────────┐     │
          │  │ Threat Detection │ │ Threat Intel     │     │
          │  │ Service          │ │ Service          │     │
          │  └────────┬─────────┘ └────────┬─────────┘     │
          │           │                     │                │
          │  ┌────────▼─────────┐ ┌────────▼─────────┐     │
          │  │ Incident Response│ │ Metrics Service  │     │
          │  │ Service          │ │ (Prometheus)     │     │
          │  └──────────────────┘ └──────────────────┘     │
          └──────────────────┬───────────────────────────┬─┘
                             │                           │
       ┌─────────────────────┼───────────┐               │
       │                     │           │               │
┌──────▼─────┐ ┌─────────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ PostgreSQL │ │ Redis Cache   │ │ MISP/OpenCTI│ │ Prometheus │
│ (Prisma)   │ │ (Rate Limit)  │ │ (Threat Int)│ │ + Grafana  │
└────────────┘ └───────────────┘ └─────────────┘ └────────────┘
```

### Fluxo de Detecção de Ameaças

```
User Message → Discord API → Bot Event (messageCreate)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ ThreatDetectionService│
                         └──────────┬───────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Google Safe   │         │ VirusTotal    │         │ Pattern       │
│ Browsing      │         │ API           │         │ Matching      │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
                         ┌────────────────┐
                         │ Threat Score   │
                         │ Aggregation    │
                         │ (0-100)        │
                         └────────┬───────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
        Score < 50       Score 50-79       Score ≥ 80
        (Log Only)      (Alert Mods)   (Auto Action + Alert)
                                │
                                ▼
                    ┌───────────────────────┐
                    │ IncidentResponseService│
                    │ (Interactive Alert)   │
                    └───────────────────────┘
```

### Padrões de Design

- **Dependency Injection** - Inversify container (singleton scope)
- **Service Layer Architecture** - Separação clara de responsabilidades
- **Event-Driven Design** - Discord.js event handlers
- **Repository Pattern** - Prisma ORM abstraction
- **Factory Pattern** - Service creation via container

---

## 🛠️ TECNOLOGIAS

### Core Stack

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **TypeScript** | 5.7 | Type-safe development |
| **Node.js** | 22.x LTS | Runtime environment |
| **Discord.js** | 14.16 | Discord API client |
| **Prisma** | 5.22 | Database ORM |
| **Redis** | 7.x | In-memory cache & rate limiting |
| **PostgreSQL** | 16.x | Relational database |
| **Inversify** | 6.0 | Dependency injection |

### External Integrations

| Serviço | Versão | Propósito |
|---------|--------|-----------|
| **MISP** | 2.4.x | Threat intelligence platform |
| **OpenCTI** | 5.x | Cyber threat intelligence |
| **Google Safe Browsing** | v4 | Malicious URL detection |
| **VirusTotal** | v3 | File/URL malware scanning |
| **Prometheus** | 2.x | Metrics collection |
| **Grafana** | 9.x | Metrics visualization |

### DevOps & Infrastructure

| Ferramenta | Propósito |
|------------|-----------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Winston** | Structured logging |
| **ESLint** | Code quality |
| **Jest** | Unit testing |

---

## 📁 ESTRUTURA DO PROJETO

```
Maximus-BOT/
├── src/                          # Código-fonte TypeScript
│   ├── index.ts                  # Entry point principal
│   ├── sharding.ts               # Discord sharding manager
│   ├── container.ts              # Inversify DI container
│   │
│   ├── commands/                 # Slash commands (/)
│   │   ├── ban.ts                ✅ Comando /ban
│   │   ├── incident.ts           ✅ Comando /incident (create/list/close)
│   │   ├── automod.ts            ✅ Comando /automod
│   │   └── ...
│   │
│   ├── events/                   # Discord event handlers
│   │   ├── ready.ts              ✅ Bot ready event
│   │   ├── messageCreate.ts      ✅ Detecção de ameaças em tempo real
│   │   ├── interactionCreate.ts  ✅ Button interactions (IR alerts)
│   │   └── guildMemberAdd.ts     ✅ Anti-raid detection
│   │
│   ├── services/                 # Business logic layer
│   │   ├── ThreatDetectionService.ts       ✅ Multi-layer threat detection
│   │   ├── ThreatIntelligenceService.ts    ✅ MISP/OpenCTI/Vértice-MAXIMUS
│   │   ├── IncidentResponseService.ts      ✅ IR automation & alerts
│   │   ├── MetricsService.ts               ✅ Prometheus metrics
│   │   ├── AutoModService.ts               ✅ Auto-moderation rules
│   │   └── AuditService.ts                 ✅ Compliance logging
│   │
│   ├── database/                 # Database layer
│   │   ├── client.ts             # Prisma client singleton
│   │   └── migrations/           # Database migrations
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Core types
│   │   └── container.ts          # DI container types
│   │
│   └── utils/                    # Utility functions
│       ├── logger.ts             ✅ Winston logger
│       ├── registerCommands.ts   ✅ Auto-register slash commands
│       └── loadEvents.ts         ✅ Auto-load event handlers
│
├── prisma/                       # Prisma ORM
│   └── schema.prisma             # Database schema
│
├── docker-compose.yml            # Full infrastructure setup
├── Dockerfile                    # Bot container image
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # ESLint rules
│
├── ANTIBURRO.md                  📖 Manual completo (iniciantes)
├── VALIDATION_CERTIFICATE.md     📋 Certificado E2E validation
├── PROJECT_COMPLETE.md           📚 Documentação técnica (4.600+ linhas)
├── MASTER_PLAN.md                📅 Roadmap de implementação
└── README.md                     📄 Este arquivo
```

---

## 🎮 COMANDOS DISCORD

### Moderação

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/ban <user> [reason] [messages]` | Banir usuário do servidor | `BAN_MEMBERS` |
| `/kick <user> [reason]` | Expulsar usuário | `KICK_MEMBERS` |
| `/timeout <user> <duration> [reason]` | Timeout em usuário | `MODERATE_MEMBERS` |
| `/warn <user> <reason>` | Adicionar warning | `MODERATE_MEMBERS` |

### Incident Response

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/incident create <type> <severity> <description>` | Criar caso de IR | `ADMINISTRATOR` |
| `/incident list` | Listar casos abertos | `ADMINISTRATOR` |
| `/incident close <case_id> <resolution>` | Fechar caso | `ADMINISTRATOR` |

### Segurança

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/scan url:<url>` | Escanear URL manualmente | `MODERATE_MEMBERS` |
| `/scan file:[arquivo]` | Escanear arquivo | `MODERATE_MEMBERS` |
| `/threatinfo [user]` | Ver detecções recentes | `ADMINISTRATOR` |

### Utilidades

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/ping` | Testar latência do bot | Todos |
| `/stats` | Estatísticas do servidor | `MODERATE_MEMBERS` |
| `/audit [user] [action]` | Ver audit log | `ADMINISTRATOR` |
| `/help [command]` | Listar comandos | Todos |

---

## 🚀 DEPLOY

### Deploy Local (Desenvolvimento)

```bash
# 1. Clonar e instalar
git clone https://github.com/JuanCS-Dev/Maximus-BOT.git
cd Maximus-BOT
npm install

# 2. Configurar .env
cp .env.example .env
# Edite .env com suas credenciais

# 3. Setup database
npm run prisma:generate
npm run prisma:push

# 4. Rodar
npm run dev
```

### Deploy Docker (Produção)

```bash
# 1. Build
npm run build

# 2. Iniciar infra completa
docker compose up -d

# 3. Monitorar
docker compose logs -f bot
```

### Deploy Cloud (Google Cloud Run)

```bash
# 1. Instalar gcloud CLI
# https://cloud.google.com/sdk/docs/install

# 2. Autenticar
gcloud auth login

# 3. Configurar projeto
gcloud config set project SEU_PROJECT_ID

# 4. Build & Deploy
gcloud run deploy vertice-bot \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Deploy VPS (Ubuntu/Debian)

```bash
# 1. SSH no servidor
ssh user@your-server.com

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Clonar repositório
git clone https://github.com/JuanCS-Dev/Maximus-BOT.git
cd Maximus-BOT

# 4. Configurar .env
cp .env.example .env
nano .env  # Edite com suas credenciais

# 5. Deploy
docker compose up -d

# 6. Setup auto-restart (systemd)
sudo systemctl enable docker
```

---

## 🤝 CONTRIBUINDO

Contribuições são bem-vindas! Por favor, leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar PRs.

### Como Contribuir

1. **Fork o repositório**
2. **Crie uma branch** (`git checkout -b feature/MinhaFeature`)
3. **Commit suas mudanças** (`git commit -m 'feat: Add MinhaFeature'`)
4. **Push para a branch** (`git push origin feature/MinhaFeature`)
5. **Abra um Pull Request**

### Guidelines

- ✅ Siga o padrão TypeScript existente
- ✅ Adicione testes para novas features
- ✅ Atualize a documentação
- ✅ Mantenha 0 erros ESLint
- ✅ Use Conventional Commits (feat:, fix:, docs:, etc.)

---

## 📊 ROADMAP

### ✅ Completo (Fases 1-5)

- [x] Foundation & Core Setup
- [x] Security & Moderation System
- [x] Threat Intelligence Integration (MISP, OpenCTI)
- [x] Incident Response Automation
- [x] Enterprise Scaling (Sharding, Metrics)

### 🚧 Planejado (Fase 6)

- [ ] Web Dashboard (React + Next.js)
- [ ] Machine Learning Threat Scoring
- [ ] Advanced SOAR Integration
- [ ] Multi-Tenant Support
- [ ] Mobile App (React Native)

Ver: [MASTER_PLAN.md](MASTER_PLAN.md)

---

## 📄 LICENÇA

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2025 Juan Carlos de Souza (JuanCS-Dev)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[...]
```

---

## 🙏 AGRADECIMENTOS

- **Anthropic** - Claude Code (AI pair programming)
- **Discord.js** - Biblioteca Discord incrível
- **MISP Project** - Threat intelligence platform
- **OpenCTI** - Cyber threat intelligence
- **Vértice-MAXIMUS** - Ecosystem integration

---

## 📞 SUPORTE

### Documentação

- 📖 **Manual Completo:** [ANTIBURRO.md](ANTIBURRO.md)
- 📚 **Docs Técnicas:** [PROJECT_COMPLETE.md](PROJECT_COMPLETE.md)
- 📋 **Validação E2E:** [VALIDATION_CERTIFICATE.md](VALIDATION_CERTIFICATE.md)

### Comunidade

- 🐛 **Report Bugs:** [GitHub Issues](https://github.com/JuanCS-Dev/Maximus-BOT/issues)
- 💡 **Feature Requests:** [GitHub Discussions](https://github.com/JuanCS-Dev/Maximus-BOT/discussions)
- 💬 **Discord:** (em breve)

### Contato

- **GitHub:** [@JuanCS-Dev](https://github.com/JuanCS-Dev)
- **Email:** (disponível no perfil GitHub)

---

## 📈 ESTATÍSTICAS DO PROJETO

![GitHub Stars](https://img.shields.io/github/stars/JuanCS-Dev/Maximus-BOT?style=social)
![GitHub Forks](https://img.shields.io/github/forks/JuanCS-Dev/Maximus-BOT?style=social)
![GitHub Issues](https://img.shields.io/github/issues/JuanCS-Dev/Maximus-BOT)
![GitHub PRs](https://img.shields.io/github/issues-pr/JuanCS-Dev/Maximus-BOT)

- **Linhas de Código:** 9.564+
- **Arquivos TypeScript:** 47
- **Comandos Discord:** 15+
- **Serviços Integrados:** 6 (MISP, OpenCTI, Safe Browsing, VirusTotal, Prometheus, Grafana)
- **Phases Complete:** 5/5 (100%)

---

<div align="center">

**Desenvolvido com ❤️ para o Sistema Vértice** 🇧🇷

**[⬆️ Voltar ao Topo](#-vértice-discord-bot)**

---

*Última atualização: 2025-10-29*

</div>
