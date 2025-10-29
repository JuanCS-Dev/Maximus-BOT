/**
 * Redis Client Mock
 * Mock implementation for Redis cache client
 */

import { vi } from 'vitest';
import type { RedisClientType } from 'redis';

/**
 * In-memory cache for testing
 */
class MockRedisStore {
  private store: Map<string, { value: string; expiry?: number }> = new Map();

  get(key: string): string | null {
    const item = this.store.get(key);
    if (!item) return null;

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: string, expiry?: number): void {
    this.store.set(key, {
      value,
      expiry: expiry ? Date.now() + expiry * 1000 : undefined,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  incr(key: string): number {
    const current = this.get(key);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    this.set(key, newValue.toString());
    return newValue;
  }

  ttl(key: string): number {
    const item = this.store.get(key);
    if (!item || !item.expiry) return -1;

    const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  expire(key: string, seconds: number): boolean {
    const item = this.store.get(key);
    if (!item) return false;

    item.expiry = Date.now() + seconds * 1000;
    return true;
  }

  clear(): void {
    this.store.clear();
  }

  keys(pattern: string): string[] {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

// Global mock store instance
const mockStore = new MockRedisStore();

/**
 * Create a mock Redis client
 */
export function createMockRedisClient(): Partial<RedisClientType> {
  return {
    get: vi.fn(async (key: string) => mockStore.get(key)),
    set: vi.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
      return 'OK';
    }),
    setEx: vi.fn(async (key: string, seconds: number, value: string) => {
      mockStore.set(key, value, seconds);
      return 'OK';
    }),
    del: vi.fn(async (key: string) => {
      mockStore.del(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => mockStore.incr(key)),
    ttl: vi.fn(async (key: string) => mockStore.ttl(key)),
    expire: vi.fn(async (key: string, seconds: number) => mockStore.expire(key, seconds)),
    keys: vi.fn(async (pattern: string) => mockStore.keys(pattern)),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    quit: vi.fn(async () => {}),
    isOpen: true,
    isReady: true,
  } as Partial<RedisClientType>;
}

/**
 * Mock Redis instance
 */
export const mockRedis = createMockRedisClient();

/**
 * Reset Redis mock store
 */
export function resetRedisMocks() {
  mockStore.clear();
  vi.clearAllMocks();
}

/**
 * Get the mock store for advanced testing
 */
export function getMockRedisStore() {
  return mockStore;
}
