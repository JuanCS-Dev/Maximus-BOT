/**
 * RateLimiter Unit Tests
 * Tests for token bucket rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, createRateLimiter } from '@/cache/rateLimiter';
import type { RateLimitConfig } from '@/cache/rateLimiter';

// Mock Redis
vi.mock('@/cache/redis', () => ({
  redis: {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
  },
  CacheKeys: {
    RATE_LIMIT: (userId: string, action: string) => `ratelimit:${action}:${userId}`,
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { redis } from '@/cache/redis';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  const config: RateLimitConfig = {
    maxActions: 5,
    windowSeconds: 10,
    action: 'test',
  };

  beforeEach(() => {
    limiter = new RateLimiter(config);
    vi.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow action when under limit', async () => {
      vi.mocked(redis.get).mockResolvedValue('2');
      vi.mocked(redis.incr).mockResolvedValue(3);
      vi.mocked(redis.ttl).mockResolvedValue(8);

      const result = await limiter.checkLimit('user123');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.resetIn).toBe(8);
    });

    it('should increment counter', async () => {
      vi.mocked(redis.get).mockResolvedValue('1');
      vi.mocked(redis.incr).mockResolvedValue(2);
      vi.mocked(redis.ttl).mockResolvedValue(9);

      await limiter.checkLimit('user123');

      expect(redis.incr).toHaveBeenCalledWith('ratelimit:test:user123');
    });

    it('should set TTL on first action', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.incr).mockResolvedValue(1);
      vi.mocked(redis.ttl).mockResolvedValue(10);

      await limiter.checkLimit('user123');

      expect(redis.expire).toHaveBeenCalledWith('ratelimit:test:user123', 10);
    });

    it('should not set TTL on subsequent actions', async () => {
      vi.mocked(redis.get).mockResolvedValue('3');
      vi.mocked(redis.incr).mockResolvedValue(4);
      vi.mocked(redis.ttl).mockResolvedValue(7);

      await limiter.checkLimit('user123');

      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('should block action when limit exceeded', async () => {
      vi.mocked(redis.get).mockResolvedValue('5');
      vi.mocked(redis.ttl).mockResolvedValue(6);

      const result = await limiter.checkLimit('user123');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(5);
      expect(result.resetIn).toBe(6);
      expect(redis.incr).not.toHaveBeenCalled();
    });

    it('should return correct reset time', async () => {
      vi.mocked(redis.get).mockResolvedValue('4');
      vi.mocked(redis.incr).mockResolvedValue(5);
      vi.mocked(redis.ttl).mockResolvedValue(3);

      const result = await limiter.checkLimit('user123');

      expect(result.resetIn).toBe(3);
    });

    it('should use window time if TTL is invalid', async () => {
      vi.mocked(redis.get).mockResolvedValue('6');
      vi.mocked(redis.ttl).mockResolvedValue(-1);

      const result = await limiter.checkLimit('user123');

      expect(result.resetIn).toBe(10);
    });

    it('should fail open on error (allow action)', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'));

      const result = await limiter.checkLimit('user123');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(5);
      expect(result.resetIn).toBe(10);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for user', async () => {
      vi.mocked(redis.del).mockResolvedValue(1);

      await limiter.reset('user123');

      expect(redis.del).toHaveBeenCalledWith('ratelimit:test:user123');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(redis.del).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(limiter.reset('user123')).resolves.not.toThrow();
    });
  });

  describe('getCurrentCount', () => {
    it('should return current count', async () => {
      vi.mocked(redis.get).mockResolvedValue('3');

      const result = await limiter.getCurrentCount('user123');

      expect(result).toBe(3);
      expect(redis.get).toHaveBeenCalledWith('ratelimit:test:user123');
    });

    it('should return 0 if no count exists', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await limiter.getCurrentCount('user123');

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'));

      const result = await limiter.getCurrentCount('user123');

      expect(result).toBe(0);
    });
  });

  describe('createRateLimiter', () => {
    it('should create custom rate limiter', () => {
      const customConfig: RateLimitConfig = {
        maxActions: 10,
        windowSeconds: 30,
        action: 'custom',
      };

      const customLimiter = createRateLimiter(customConfig);

      expect(customLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should use custom config in created limiter', async () => {
      const customConfig: RateLimitConfig = {
        maxActions: 3,
        windowSeconds: 5,
        action: 'custom',
      };

      const customLimiter = createRateLimiter(customConfig);

      vi.mocked(redis.get).mockResolvedValue('3');
      vi.mocked(redis.ttl).mockResolvedValue(2);

      const result = await customLimiter.checkLimit('user123');

      expect(result.limit).toBe(3);
      expect(result.resetIn).toBe(2);
    });
  });
});
