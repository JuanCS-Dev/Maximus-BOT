# 🤖 Vértice Discord Bot

Bot de administração e moderação completo para Discord, desenvolvido em TypeScript.

## ✨ Features

### ✅ Implementado
- 🔨 **Moderação Básica**: Comando `/ban` completo
- 📝 **Sistema de Logs**: Winston logger configurado
- ⚙️ **TypeScript**: Type-safe e profissional
- 🐳 **Docker**: Pronto para containerização
- ☁️ **Google Cloud**: Deploy configurado

### 🚧 A Implementar (você pode adicionar)
- 👢 Comando `/kick`
- 🔇 Comandos `/mute` e `/unmute`
- ⚠️ Comando `/warn` e sistema de avisos
- 🛡️ Auto-moderação (anti-spam, filtro de palavrões)
- 📊 Sistema de logs em canal Discord
- 🎭 Reaction Roles automáticos

## 🚀 Quick Start

### 1. Criar Bot no Discord
1. https://discord.com/developers/applications
2. New Application → Bot → Copy Token
3. Ativar **MESSAGE CONTENT INTENT**

### 2. Instalar e Configurar
```bash
cd /home/maximus/Documentos/discord-bot-vertice
npm install
cp .env.example .env
# Edite .env com seu token
```

### 3. Rodar
```bash
npm run dev
```

## 📖 Documentação Completa

Veja **SETUP_COMPLETO.md** para:
- Guia detalhado de setup
- Deploy no Google Cloud Run
- Como adicionar novos comandos
- Troubleshooting

## 🛠️ Tecnologias

- **Discord.js v14** - Biblioteca oficial
- **TypeScript** - Type safety
- **Winston** - Logging profissional
- **Docker** - Containerização
- **Google Cloud Run** - Hosting serverless

## 📁 Estrutura

```
src/
├── index.ts              # Entry point
├── types/                # TypeScript types
├── commands/             # Slash commands
│   └── ban.ts           ✅ Implementado
├── events/               # Discord events
├── utils/                # Utilities
│   ├── logger.ts        ✅ Implementado
│   ├── registerCommands.ts  ✅ Implementado
│   └── loadEvents.ts    ✅ Implementado
└── services/             # Business logic
```

## 🤝 Como Contribuir

1. Adicione comandos em `src/commands/`
2. Adicione eventos em `src/events/`
3. Siga o padrão TypeScript existente
4. Teste localmente antes de deploy

## 📝 Licença

MIT

---

**Desenvolvido para o Sistema Vértice** 🇧🇷
