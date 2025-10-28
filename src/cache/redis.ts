import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

/**
 * Redis Cache Client Singleton
 * Used for caching guild configs, rate limiting, and temporary data
 */
class CacheClient {
  private static instance: RedisClientType | null = null;
  private static isConnected = false;

  /**
   * Get the Redis client instance (singleton pattern)
   */
  static getInstance(): RedisClientType {
    if (!CacheClient.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      CacheClient.instance = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection attempts exceeded');
              return new Error('Redis reconnection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis reconnecting in ${delay}ms...`);
            return delay;
          },
        },
      });

      // Error handling
      CacheClient.instance.on('error', (error) => {
        logger.error('Redis client error:', error);
      });

      CacheClient.instance.on('connect', () => {
        logger.debug('Redis client connecting...');
      });

      CacheClient.instance.on('ready', () => {
        CacheClient.isConnected = true;
        logger.info('✅ Redis client ready');
      });

      CacheClient.instance.on('reconnecting', () => {
        logger.warn('Redis client reconnecting...');
      });

      CacheClient.instance.on('end', () => {
        CacheClient.isConnected = false;
        logger.warn('Redis client disconnected');
      });
    }

    return CacheClient.instance;
  }

  /**
   * Connect to Redis
   */
  static async connect(): Promise<void> {
    if (CacheClient.isConnected) {
      logger.debug('Redis already connected');
      return;
    }

    try {
      const client = CacheClient.getInstance();
      await client.connect();
      logger.info('✅ Connected to Redis cache');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  static async disconnect(): Promise<void> {
    if (!CacheClient.instance || !CacheClient.isConnected) {
      return;
    }

    try {
      await CacheClient.instance.quit();
      CacheClient.isConnected = false;
      logger.info('Disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  static getConnectionStatus(): boolean {
    return CacheClient.isConnected;
  }

  /**
   * Health check - verify Redis is responsive
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = CacheClient.getInstance();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Export the singleton instance
export const redis = CacheClient.getInstance();

// Export utility functions
export const {
  connect: connectCache,
  disconnect: disconnectCache,
  getConnectionStatus: getCacheConnectionStatus,
  healthCheck: cacheHealthCheck,
} = CacheClient;

// ========================================
// CACHE UTILITIES
// ========================================

/**
 * Cache key prefixes for organization
 */
export const CacheKeys = {
  GUILD_SETTINGS: (guildId: string) => `guild:${guildId}:settings`,
  GUILD_CONFIG: (guildId: string) => `guild:${guildId}:config`,
  USER_WARNINGS: (userId: string, guildId: string) => `warnings:${guildId}:${userId}`,
  RATE_LIMIT: (userId: string, action: string) => `ratelimit:${action}:${userId}`,
  SPAM_TRACKER: (userId: string, guildId: string) => `spam:${guildId}:${userId}`,
  CUSTOM_COMMAND: (guildId: string, trigger: string) => `cmd:${guildId}:${trigger}`,
  REACTION_ROLE: (messageId: string) => `reactionrole:${messageId}`,
  TEMP_DATA: (key: string) => `temp:${key}`,
};

/**
 * Default TTL (Time To Live) values in seconds
 */
export const CacheTTL = {
  GUILD_SETTINGS: 3600, // 1 hour
  USER_WARNINGS: 1800, // 30 minutes
  RATE_LIMIT: 60, // 1 minute
  SPAM_TRACKER: 10, // 10 seconds
  CUSTOM_COMMAND: 3600, // 1 hour
  REACTION_ROLE: 86400, // 24 hours
  TEMP_DATA: 300, // 5 minutes
};

/**
 * Get cached data with JSON parsing
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`Error getting cached data for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data with JSON stringification
 */
export async function setCached<T>(key: string, value: T, ttl?: number): Promise<void> {
  try {
    const data = JSON.stringify(value);
    if (ttl) {
      await redis.setEx(key, ttl, data);
    } else {
      await redis.set(key, data);
    }
  } catch (error) {
    logger.error(`Error setting cached data for key ${key}:`, error);
  }
}

/**
 * Delete cached data
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error(`Error deleting cached data for key ${key}:`, error);
  }
}

/**
 * Delete multiple cached keys matching a pattern
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    logger.error(`Error deleting cached pattern ${pattern}:`, error);
  }
}

/**
 * Increment a counter (for rate limiting)
 */
export async function incrementCounter(key: string, ttl?: number): Promise<number> {
  try {
    const value = await redis.incr(key);
    if (ttl && value === 1) {
      await redis.expire(key, ttl);
    }
    return value;
  } catch (error) {
    logger.error(`Error incrementing counter for key ${key}:`, error);
    return 0;
  }
}

/**
 * Check if a key exists in cache
 */
export async function existsInCache(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error(`Error checking existence for key ${key}:`, error);
    return false;
  }
}

/**
 * Add item to a set (useful for tracking unique items)
 */
export async function addToSet(key: string, ...members: string[]): Promise<void> {
  try {
    await redis.sAdd(key, members);
  } catch (error) {
    logger.error(`Error adding to set ${key}:`, error);
  }
}

/**
 * Check if item is in a set
 */
export async function isInSet(key: string, member: string): Promise<boolean> {
  try {
    return await redis.sIsMember(key, member);
  } catch (error) {
    logger.error(`Error checking set membership for ${key}:`, error);
    return false;
  }
}

/**
 * Remove item from a set
 */
export async function removeFromSet(key: string, ...members: string[]): Promise<void> {
  try {
    await redis.sRem(key, members);
  } catch (error) {
    logger.error(`Error removing from set ${key}:`, error);
  }
}
