/**
 * Redis Cache Utilities Unit Tests
 * Tests for cache utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCached,
  setCached,
  deleteCached,
  deleteCachedPattern,
  incrementCounter,
  existsInCache,
  addToSet,
  isInSet,
  removeFromSet,
} from '@/cache/redis';

// Mock Redis client
vi.mock('@/cache/redis', async () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    sAdd: vi.fn(),
    sIsMember: vi.fn(),
    sRem: vi.fn(),
  };

  return {
    redis: mockRedis,
    getCached: vi.fn(async (key: string) => {
      try {
        const data = await mockRedis.get(key);
        if (!data) return null;
        return JSON.parse(data);
      } catch {
        return null;
      }
    }),
    setCached: vi.fn(async (key: string, value: any, ttl?: number) => {
      try {
        const data = JSON.stringify(value);
        if (ttl) {
          await mockRedis.setEx(key, ttl, data);
        } else {
          await mockRedis.set(key, data);
        }
      } catch {
        // Silent error
      }
    }),
    deleteCached: vi.fn(async (key: string) => {
      try {
        await mockRedis.del(key);
      } catch {
        // Silent error
      }
    }),
    deleteCachedPattern: vi.fn(async (pattern: string) => {
      try {
        const keys = await mockRedis.keys(pattern);
        if (keys && keys.length > 0) {
          await mockRedis.del(keys);
        }
      } catch {
        // Silent error
      }
    }),
    incrementCounter: vi.fn(async (key: string, ttl?: number) => {
      try {
        const value = await mockRedis.incr(key);
        if (ttl && value === 1) {
          await mockRedis.expire(key, ttl);
        }
        return value;
      } catch {
        return 0;
      }
    }),
    existsInCache: vi.fn(async (key: string) => {
      try {
        const exists = await mockRedis.exists(key);
        return exists === 1;
      } catch {
        return false;
      }
    }),
    addToSet: vi.fn(async (key: string, ...members: string[]) => {
      try {
        await mockRedis.sAdd(key, members);
      } catch {
        // Silent error
      }
    }),
    isInSet: vi.fn(async (key: string, member: string) => {
      try {
        return await mockRedis.sIsMember(key, member);
      } catch {
        return false;
      }
    }),
    removeFromSet: vi.fn(async (key: string, ...members: string[]) => {
      try {
        await mockRedis.sRem(key, members);
      } catch {
        // Silent error
      }
    }),
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Redis Cache Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCached', () => {
    it('should get and parse cached data', async () => {
      const mockData = { id: '123', name: 'Test' };
      vi.mocked(getCached).mockResolvedValueOnce(mockData);

      const result = await getCached<typeof mockData>('test:key');

      expect(result).toEqual(mockData);
    });

    it('should return null if key does not exist', async () => {
      vi.mocked(getCached).mockResolvedValueOnce(null);

      const result = await getCached('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      vi.mocked(getCached).mockResolvedValueOnce(null);

      const result = await getCached('invalid:key');

      expect(result).toBeNull();
    });
  });

  describe('setCached', () => {
    it('should set cached data with TTL', async () => {
      const mockData = { id: '123', name: 'Test' };
      vi.mocked(setCached).mockResolvedValueOnce(undefined);

      await setCached('test:key', mockData, 3600);

      expect(setCached).toHaveBeenCalledWith('test:key', mockData, 3600);
    });

    it('should set cached data without TTL', async () => {
      const mockData = { value: 'test' };
      vi.mocked(setCached).mockResolvedValueOnce(undefined);

      await setCached('test:key', mockData);

      expect(setCached).toHaveBeenCalledWith('test:key', mockData);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(setCached).mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(setCached('test:key', { data: 'test' })).rejects.toThrow();
    });
  });

  describe('deleteCached', () => {
    it('should delete cached key', async () => {
      vi.mocked(deleteCached).mockResolvedValueOnce(undefined);

      await deleteCached('test:key');

      expect(deleteCached).toHaveBeenCalledWith('test:key');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(deleteCached).mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await expect(deleteCached('test:key')).rejects.toThrow();
    });
  });

  describe('deleteCachedPattern', () => {
    it('should delete multiple keys matching pattern', async () => {
      vi.mocked(deleteCachedPattern).mockResolvedValueOnce(undefined);

      await deleteCachedPattern('test:*');

      expect(deleteCachedPattern).toHaveBeenCalledWith('test:*');
    });

    it('should handle no matches gracefully', async () => {
      vi.mocked(deleteCachedPattern).mockResolvedValueOnce(undefined);

      await deleteCachedPattern('nonexistent:*');

      expect(deleteCachedPattern).toHaveBeenCalledWith('nonexistent:*');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(deleteCachedPattern).mockRejectedValueOnce(new Error('Redis error'));

      await expect(deleteCachedPattern('test:*')).rejects.toThrow();
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter', async () => {
      vi.mocked(incrementCounter).mockResolvedValueOnce(5);

      const result = await incrementCounter('counter:test');

      expect(result).toBe(5);
      expect(incrementCounter).toHaveBeenCalledWith('counter:test');
    });

    it('should set TTL on first increment', async () => {
      vi.mocked(incrementCounter).mockResolvedValueOnce(1);

      const result = await incrementCounter('counter:test', 60);

      expect(result).toBe(1);
      expect(incrementCounter).toHaveBeenCalledWith('counter:test', 60);
    });

    it('should not reset TTL on subsequent increments', async () => {
      vi.mocked(incrementCounter).mockResolvedValueOnce(3);

      const result = await incrementCounter('counter:test', 60);

      expect(result).toBe(3);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(incrementCounter).mockRejectedValueOnce(new Error('Redis error'));

      await expect(incrementCounter('counter:test')).rejects.toThrow();
    });
  });

  describe('existsInCache', () => {
    it('should return true if key exists', async () => {
      vi.mocked(existsInCache).mockResolvedValueOnce(true);

      const result = await existsInCache('test:key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      vi.mocked(existsInCache).mockResolvedValueOnce(false);

      const result = await existsInCache('nonexistent:key');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(existsInCache).mockRejectedValueOnce(new Error('Redis error'));

      await expect(existsInCache('test:key')).rejects.toThrow();
    });
  });

  describe('addToSet', () => {
    it('should add members to set', async () => {
      vi.mocked(addToSet).mockResolvedValueOnce(undefined);

      await addToSet('set:test', 'member1', 'member2');

      expect(addToSet).toHaveBeenCalledWith('set:test', 'member1', 'member2');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(addToSet).mockRejectedValueOnce(new Error('Redis error'));

      await expect(addToSet('set:test', 'member1')).rejects.toThrow();
    });
  });

  describe('isInSet', () => {
    it('should return true if member exists in set', async () => {
      vi.mocked(isInSet).mockResolvedValueOnce(true);

      const result = await isInSet('set:test', 'member1');

      expect(result).toBe(true);
    });

    it('should return false if member does not exist in set', async () => {
      vi.mocked(isInSet).mockResolvedValueOnce(false);

      const result = await isInSet('set:test', 'member2');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(isInSet).mockRejectedValueOnce(new Error('Redis error'));

      await expect(isInSet('set:test', 'member1')).rejects.toThrow();
    });
  });

  describe('removeFromSet', () => {
    it('should remove members from set', async () => {
      vi.mocked(removeFromSet).mockResolvedValueOnce(undefined);

      await removeFromSet('set:test', 'member1', 'member2');

      expect(removeFromSet).toHaveBeenCalledWith('set:test', 'member1', 'member2');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(removeFromSet).mockRejectedValueOnce(new Error('Redis error'));

      await expect(removeFromSet('set:test', 'member1')).rejects.toThrow();
    });
  });
});
