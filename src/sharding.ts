import { ShardingManager } from 'discord.js';
import path from 'path';
import { logger } from './utils/logger';

/**
 * Discord Hybrid Sharding Manager
 *
 * Enables the bot to scale beyond 2,500 guilds by distributing
 * the workload across multiple processes (shards).
 *
 * Discord Sharding:
 * - 1 shard per 1,000 guilds (recommended)
 * - Each shard = separate process
 * - Automatic load balancing
 * - Inter-shard communication via IPC
 *
 * Usage:
 * - Development: npm run dev (single process)
 * - Production (sharded): npm run start:sharded
 *
 * Configuration:
 * - AUTO: Discord calculates optimal shard count
 * - MANUAL: Set SHARD_COUNT env variable
 */

const main = async () => {
  try {
    logger.info('🚀 Starting MAXIMUS Discord Bot with Hybrid Sharding...');

    // Check if Discord token is present
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      logger.error('❌ DISCORD_TOKEN not found in environment variables');
      process.exit(1);
    }

    // Determine shard count
    const shardCount = process.env.SHARD_COUNT
      ? parseInt(process.env.SHARD_COUNT, 10)
      : 'auto'; // Discord auto-calculates based on guild count

    logger.info(`Shard configuration: ${shardCount === 'auto' ? 'AUTO' : `${shardCount} shards`}`);

    // Create sharding manager
    const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
      token,
      totalShards: shardCount,
      respawn: true, // Auto-restart crashed shards
      shardArgs: process.argv.slice(2),
      execArgv: process.execArgv,
    });

    // Shard lifecycle events
    manager.on('shardCreate', (shard) => {
      logger.info(`✅ Shard ${shard.id} launched`);

      shard.on('ready', () => {
        logger.info(`🟢 Shard ${shard.id} ready`);
      });

      shard.on('disconnect', () => {
        logger.warn(`🟡 Shard ${shard.id} disconnected`);
      });

      shard.on('reconnecting', () => {
        logger.info(`🔄 Shard ${shard.id} reconnecting...`);
      });

      shard.on('death', () => {
        logger.error(`💀 Shard ${shard.id} died`);
      });

      shard.on('error', (error) => {
        logger.error(`❌ Shard ${shard.id} error:`, error);
      });

      // Listen for custom messages from shards
      shard.on('message', (message) => {
        handleShardMessage(shard.id, message);
      });
    });

    // Spawn all shards
    await manager.spawn({ amount: shardCount, delay: 5000, timeout: 60000 });

    logger.info(
      `🎉 All shards spawned successfully! Total: ${manager.shards.size}`
    );

    // Broadcast stats periodically
    setInterval(() => {
      broadcastShardStats(manager);
    }, 60000); // Every minute

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('🛑 Shutting down sharding manager...');

      try {
        // Broadcast shutdown to all shards
        await manager.broadcastEval(() => {
          return 'Shutdown initiated';
        });

        // Destroy all shards
        manager.shards.forEach((shard) => {
          shard.kill();
        });

        logger.info('✅ All shards shut down successfully');
        process.exit(0);
      } catch (error: unknown) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: unknown) {
    logger.error('❌ Fatal error in sharding manager:', error);
    process.exit(1);
  }
};

/**
 * Handle custom messages from shards
 */
function handleShardMessage(shardId: number, message: any): void {
  try {
    if (message?.type === 'stats') {
      logger.debug(
        `Shard ${shardId} stats: ${message.guilds} guilds, ${message.users} users`
      );
    } else if (message?.type === 'threat_detected') {
      logger.info(
        `🚨 Shard ${shardId}: Threat detected (score: ${message.score})`
      );
    } else if (message?.type === 'incident_created') {
      logger.info(
        `📋 Shard ${shardId}: Incident case created (${message.caseId})`
      );
    }
  } catch (error: unknown) {
    logger.error(`Error handling shard message:`, error);
  }
}

/**
 * Broadcast shard statistics
 */
async function broadcastShardStats(manager: ShardingManager): Promise<void> {
  try {
    const results = await manager.broadcastEval((client) => {
      return {
        shardId: client.shard?.ids[0] ?? 0,
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        uptime: client.uptime,
        ping: client.ws.ping,
      };
    });

    const totalGuilds = results.reduce((acc, r) => acc + r.guilds, 0);
    const totalUsers = results.reduce((acc, r) => acc + r.users, 0);
    const avgPing =
      results.reduce((acc, r) => acc + r.ping, 0) / results.length;

    logger.info(
      `📊 Cluster Stats: ${totalGuilds} guilds, ${totalUsers} users, ${avgPing.toFixed(0)}ms avg ping`
    );

    // Log individual shard stats
    results.forEach((stat) => {
      logger.debug(
        `Shard ${stat.shardId}: ${stat.guilds}g, ${stat.users}u, ${stat.ping}ms`
      );
    });
  } catch (error: unknown) {
    logger.error('Error broadcasting shard stats:', error);
  }
}

// Start sharding manager
main();
