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
import express from 'express';
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

// Health check HTTP server para Cloud Run
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', async (_req, res) => {
  try {
    // Check Discord connection
    if (!client.isReady()) {
      return res.status(503).json({
        status: 'unhealthy',
        reason: 'Discord client not ready',
        uptime: process.uptime(),
      });
    }

    // Check database connection
    const { prisma } = await import('./database/client');
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection
    const { redis } = await import('./cache/redis');
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      discord: {
        ready: client.isReady(),
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        commands: client.commands.size,
        ping: client.ws.ping,
      },
      database: 'connected',
      cache: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/ready', (_req, res) => {
  if (client.isReady()) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Vértice Discord Bot',
    version: '1.0.0',
    status: 'running',
    uptime: process.uptime(),
  });
});

// Start HTTP server
app.listen(PORT, () => {
  logger.info(`🏥 Health check server listening on port ${PORT}`);
});

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
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

  // Set timeout for forced shutdown
  const forceShutdownTimer = setTimeout(() => {
    logger.error('⏱️  Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Disconnect from Discord
    logger.info('Disconnecting from Discord...');
    client.destroy();
    logger.info('✅ Disconnected from Discord');

    // Disconnect from database
    logger.info('Disconnecting from database...');
    await disconnectDatabase();
    logger.info('✅ Disconnected from PostgreSQL');

    // Disconnect from cache
    logger.info('Disconnecting from cache...');
    await disconnectCache();
    logger.info('✅ Disconnected from Redis');

    clearTimeout(forceShutdownTimer);
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    clearTimeout(forceShutdownTimer);
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
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Iniciar bot
start();

export { client };
