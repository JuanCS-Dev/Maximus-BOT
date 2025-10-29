/**
 * Test Utilities
 * Helper functions for testing
 */

import { vi } from 'vitest';

/**
 * Wait for a specified amount of time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock console methods to suppress output during tests
 */
export function suppressConsoleLogs() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
}

/**
 * Restore console methods
 */
export function restoreConsoleLogs() {
  vi.restoreAllMocks();
}

/**
 * Create a promise that rejects after timeout
 */
export function timeout(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

/**
 * Run function with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  return Promise.race([promise, timeout(ms, message)]);
}

/**
 * Generate random Discord snowflake ID (18-19 digits)
 */
export function generateSnowflake(): string {
  return (BigInt(Date.now() - 1420070400000) << BigInt(22)).toString();
}

/**
 * Generate random hex color
 */
export function generateRandomColor(): number {
  return Math.floor(Math.random() * 0xffffff);
}

/**
 * Assert that a function throws with specific message
 */
export async function expectToThrow(
  fn: () => Promise<any> | any,
  message?: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (message) {
      if (typeof message === 'string') {
        if (!(error as Error).message.includes(message)) {
          throw new Error(
            `Expected error message to include "${message}", but got "${(error as Error).message}"`
          );
        }
      } else {
        if (!message.test((error as Error).message)) {
          throw new Error(
            `Expected error message to match ${message}, but got "${(error as Error).message}"`
          );
        }
      }
    }
  }
}

/**
 * Mock Date.now() for testing
 */
export function mockDateNow(timestamp: number) {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Restore Date.now()
 */
export function restoreDateNow() {
  vi.restoreAllMocks();
}

/**
 * Create a deep clone of an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join(
    ''
  );
}

/**
 * Generate random number between min and max
 */
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
