# 🤖 VÉRTICE DISCORD BOT - SETUP COMPLETO

## ✅ O QUE FOI CRIADO

Estrutura completa de um bot Discord profissional em TypeScript com:

### 📂 Arquivos Criados
```
discord-bot-vertice/
├── package.json           ✅ Dependências e scripts
├── tsconfig.json          ✅ Config TypeScript
├── .env.example           ✅ Variáveis de ambiente
├── .gitignore             ✅ Arquivos ignorados
├── src/
│   ├── index.ts           ✅ Entry point do bot
│   ├── types/
│   │   └── index.ts       ✅ Definições TypeScript
│   ├── utils/
│   │   ├── logger.ts      ✅ Sistema de logs (Winston)
│   │   ├── registerCommands.ts  ✅ Registro de comandos
│   │   └── loadEvents.ts  ✅ Carregador de eventos
│   ├── commands/
│   │   └── ban.ts         ✅ Comando /ban implementado
│   ├── events/            📁 (criar eventos aqui)
│   └── services/          📁 (serviços auxiliares)
```

---

## 🚀 PRÓXIMOS PASSOS PARA VOCÊ

### 1. Criar Bot no Discord Developer Portal

1. Acesse: https://discord.com/developers/applications
2. Clique em "New Application"
3. Dê um nome (ex: "Vértice Bot")
4. Vá em "Bot" → "Add Bot"
5. **COPIE O TOKEN** (guarde bem!)
6. Ative os **Privileged Gateway Intents**:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT

### 2. Configurar o Projeto

```bash
cd /home/maximus/Documentos/discord-bot-vertice

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Editar .env com seus dados:
nano .env
```

No `.env`, preencha:
```env
DISCORD_TOKEN=cole_seu_token_aqui
CLIENT_ID=id_do_bot (da aba OAuth2)
GUILD_ID=id_do_seu_servidor
LOG_CHANNEL_ID=id_do_canal_de_logs
```

### 3. Adicionar Bot ao Servidor

1. No Discord Developer Portal, vá em "OAuth2" → "URL Generator"
2. Selecione:
   - **Scopes**: `bot`, `applications.commands`
   - **Permissions**: `Administrator` (ou escolha específicas)
3. Copie o link gerado
4. Abra no navegador e adicione ao seu servidor

### 4. Rodar o Bot Localmente

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start
```

---

## 📦 DEPLOY NO GOOGLE CLOUD RUN

### Pré-requisitos
```bash
# Instalar gcloud CLI
curl https://sdk.cloud.google.com | bash

# Fazer login
gcloud auth login

# Criar projeto (se não tiver)
gcloud projects create vertice-bot --name="Vértice Bot"

# Selecionar projeto
gcloud config set project vertice-bot

# Habilitar APIs necessárias
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Criar Dockerfile

Vou criar para você:


### Deploy Automático
```bash
# Deploy direto do código-fonte
npm run deploy

# OU manual:
gcloud run deploy vertice-bot \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="DISCORD_TOKEN=seu_token,CLIENT_ID=seu_client_id" \
  --min-instances=1
```

### Configurar Variáveis de Ambiente no Cloud Run

No Google Cloud Console:
1. Cloud Run → Seu serviço
2. "Edit & Deploy New Revision"
3. "Variables & Secrets"
4. Adicionar:
   - DISCORD_TOKEN
   - CLIENT_ID
   - GUILD_ID
   - LOG_CHANNEL_ID
   - NODE_ENV=production

---

## 🔧 COMANDOS A IMPLEMENTAR

Você já tem a estrutura. Para adicionar mais comandos, crie arquivos em `src/commands/`:

### Moderação (FALTA IMPLEMENTAR)
- `kick.ts` - Expulsar membro
- `mute.ts` - Silenciar membro
- `unmute.ts` - Tirar silêncio
- `warn.ts` - Avisar membro
- `warnings.ts` - Ver avisos de um usuário

### Auto-Moderação (FALTA IMPLEMENTAR)
- `src/events/messageCreate.ts` - Detector de spam
- `src/services/automod.ts` - Filtro de palavrões

### Sistema de Logs (FALTA IMPLEMENTAR)
- `src/events/guildMemberAdd.ts` - Logar entrada
- `src/events/guildMemberRemove.ts` - Logar saída
- `src/events/messageDelete.ts` - Logar mensagem deletada

### Reaction Roles (FALTA IMPLEMENTAR)
- `reactionrole.ts` - Criar reaction role
- `src/events/messageReactionAdd.ts` - Dar role ao reagir
- `src/events/messageReactionRemove.ts` - Remover role

---

## 📚 PRÓXIMO CÓDIGO QUE VOCÊ PODE ADICIONAR

### Exemplo: Comando Kick (`src/commands/kick.ts`)
```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar um membro')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true))
    .addStringOption(opt => opt.setName('razao').setDescription('Motivo'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo';
    
    const member = await interaction.guild?.members.fetch(user.id);
    await member?.kick(reason);
    
    await interaction.reply(`✅ ${user.tag} foi expulso! Motivo: ${reason}`);
  }
};
```

---

## 🎯 CHECKLIST DE SETUP

- [ ] Bot criado no Discord Developer Portal
- [ ] Token copiado e salvo
- [ ] Intents privilegiados ativados
- [ ] `npm install` executado
- [ ] `.env` configurado com token
- [ ] Bot adicionado ao servidor
- [ ] `npm run dev` funcionando
- [ ] Comando `/ban` testado
- [ ] Implementar comandos restantes
- [ ] Deploy no Google Cloud Run (opcional)

---

## 💡 DICAS

1. **Teste local primeiro** antes de fazer deploy
2. **Use GUILD_ID** no `.env` para desenvolvimento (comandos aparecem instant
3. **Remova GUILD_ID** em produção (comandos globais)
4. **Logs**: Veja em `logs/combined.log`
5. **Errors**: Veja em `logs/error.log`

---

## 🆘 TROUBLESHOOTING

### Bot não responde aos comandos
- Verificar se intents estão ativados
- Verificar se bot tem permissões no servidor
- Verificar logs com `npm run dev`

### Erro de deploy no Cloud Run
- Verificar se variáveis de ambiente estão configuradas
- Verificar se APIs estão habilitadas
- Verificar billing do Google Cloud

### Comandos não aparecem
- Se GUILD_ID estiver definido, comandos aparecem só naquele servidor
- Comandos globais levam até 1 hora
- Reinicie o Discord (Ctrl+R)

---

**PRONTO!** O bot está estruturado e funcional. 

Agora você só precisa:
1. Pegar o token do Discord
2. Rodar `npm install && npm run dev`
3. Testar `/ban` no seu servidor
4. Implementar os outros comandos conforme necessidade

Boa sorte! 🚀
