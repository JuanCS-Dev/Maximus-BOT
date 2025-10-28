import { redis, CacheKeys } from './redis';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Configuration
 */
export interface RateLimitConfig {
  /** Maximum number of actions allowed */
  maxActions: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Action identifier (e.g., 'command', 'message', 'reaction') */
  action: string;
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Current count of actions */
  current: number;
  /** Maximum allowed actions */
  limit: number;
  /** Seconds until reset */
  resetIn: number;
}

/**
 * Rate Limiter Class
 * Implements token bucket algorithm using Redis
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if an action is allowed for a user
   * Returns rate limit result with details
   */
  async checkLimit(userId: string): Promise<RateLimitResult> {
    const key = CacheKeys.RATE_LIMIT(userId, this.config.action);

    try {
      // Get current count
      const currentStr = await redis.get(key);
      const current = currentStr ? parseInt(currentStr, 10) : 0;

      // Check if limit exceeded
      if (current >= this.config.maxActions) {
        const ttl = await redis.ttl(key);
        return {
          allowed: false,
          current,
          limit: this.config.maxActions,
          resetIn: ttl > 0 ? ttl : this.config.windowSeconds,
        };
      }

      // Increment counter
      const newCount = await redis.incr(key);

      // Set expiry on first action
      if (newCount === 1) {
        await redis.expire(key, this.config.windowSeconds);
      }

      // Get TTL for reset time
      const ttl = await redis.ttl(key);

      return {
        allowed: true,
        current: newCount,
        limit: this.config.maxActions,
        resetIn: ttl > 0 ? ttl : this.config.windowSeconds,
      };
    } catch (error) {
      logger.error(`Rate limiter error for ${userId}:`, error);
      // On error, allow the action (fail open)
      return {
        allowed: true,
        current: 0,
        limit: this.config.maxActions,
        resetIn: this.config.windowSeconds,
      };
    }
  }

  /**
   * Reset rate limit for a user
   */
  async reset(userId: string): Promise<void> {
    const key = CacheKeys.RATE_LIMIT(userId, this.config.action);
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Error resetting rate limit for ${userId}:`, error);
    }
  }

  /**
   * Get current count without incrementing
   */
  async getCurrentCount(userId: string): Promise<number> {
    const key = CacheKeys.RATE_LIMIT(userId, this.config.action);
    try {
      const currentStr = await redis.get(key);
      return currentStr ? parseInt(currentStr, 10) : 0;
    } catch (error) {
      logger.error(`Error getting current count for ${userId}:`, error);
      return 0;
    }
  }
}

/**
 * Pre-configured rate limiters for common actions
 */
export const RateLimiters = {
  /** Command usage: 5 commands per 10 seconds */
  COMMAND: new RateLimiter({
    maxActions: 5,
    windowSeconds: 10,
    action: 'command',
  }),

  /** Message spam: 10 messages per 5 seconds */
  MESSAGE: new RateLimiter({
    maxActions: 10,
    windowSeconds: 5,
    action: 'message',
  }),

  /** Reaction spam: 20 reactions per 10 seconds */
  REACTION: new RateLimiter({
    maxActions: 20,
    windowSeconds: 10,
    action: 'reaction',
  }),

  /** Join spam (for raid detection): 10 joins per 10 seconds */
  JOIN: new RateLimiter({
    maxActions: 10,
    windowSeconds: 10,
    action: 'join',
  }),

  /** API calls: 30 calls per minute */
  API: new RateLimiter({
    maxActions: 30,
    windowSeconds: 60,
    action: 'api',
  }),
};

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}
