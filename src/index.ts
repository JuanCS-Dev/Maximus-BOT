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

import 'reflect-metadata'; // Required for Inversify
import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { registerCommands } from './utils/registerCommands';
import { loadEvents } from './utils/loadEvents';
import { CommandType } from './types';
import { connectDatabase, disconnectDatabase } from './database/client';
import { connectCache, disconnectCache } from './cache/redis';
import './container'; // Initialize DI container

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

    // Conectar ao banco de dados
    logger.info('📊 Conectando ao PostgreSQL...');
    await connectDatabase();

    // Conectar ao cache Redis
    logger.info('💾 Conectando ao Redis...');
    await connectCache();

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

// Graceful shutdown
async function shutdown() {
  logger.info('🛑 Desligando bot...');

  try {
    // Disconnect from Discord
    client.destroy();
    logger.info('Desconectado do Discord');

    // Disconnect from database
    await disconnectDatabase();
    logger.info('Desconectado do PostgreSQL');

    // Disconnect from cache
    await disconnectCache();
    logger.info('Desconectado do Redis');

    process.exit(0);
  } catch (error) {
    logger.error('Erro durante shutdown:', error);
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

// Graceful shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Iniciar bot
start();

export { client };
