/**
 * Smoke Test
 * Validates that Vitest setup is working correctly
 */

import { describe, it, expect } from 'vitest';

describe('Vitest Setup', () => {
  it('should run basic assertions', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should have access to globals', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should handle objects correctly', () => {
    const obj = { name: 'Vértice', version: '1.0.0' };
    expect(obj).toHaveProperty('name');
    expect(obj).toHaveProperty('version', '1.0.0');
  });

  it('should handle arrays correctly', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
