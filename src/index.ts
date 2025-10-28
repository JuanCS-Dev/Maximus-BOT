/**
 * Vértice Discord Bot
 * Bot de administração e moderação completo
 *
 * Features:
 * - Moderação básica (ban/kick/mute/warn)
 * - Auto-moderação (anti-spam, filtros de palavrões)
 * - Sistema de logs/auditoria completo
 * - Sistema de roles automático (reaction roles)
 * - Deploy no Google Cloud Run
 */

import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { registerCommands } from './utils/registerCommands';
import { loadEvents } from './utils/loadEvents';
import { CommandType } from './types';

dotenv.config();

// Criar cliente Discord com intents necessários
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

// Adicionar coleção de comandos ao cliente
client.commands = new Collection<string, CommandType>();

// Inicializar bot
async function start() {
  try {
    logger.info('🚀 Iniciando Vértice Discord Bot...');

    // Carregar comandos
    await registerCommands(client);
    logger.info(`✅ ${client.commands.size} comandos carregados`);

    // Carregar eventos
    await loadEvents(client);
    logger.info('✅ Eventos carregados');

    // Login no Discord
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN não encontrado no .env');
    }

    await client.login(token);
    logger.info('✅ Bot conectado ao Discord!');
  } catch (error) {
    logger.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

// Tratamento de erros global
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Iniciar bot
start();

export { client };
