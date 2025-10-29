/**
 * Global Test Setup
 * Configures test environment, mocks, and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Setup environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

  // Future: Connect to test database
  console.log('🧪 Test environment initialized');
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  // Future: Disconnect from test database
  console.log('✅ Test environment cleaned up');
});

/**
 * Before each test - runs before every test case
 */
beforeEach(() => {
  // Reset mocks before each test
  // This is handled by vitest config: mockReset: true
});

/**
 * After each test - runs after every test case
 */
afterEach(() => {
  // Clean up any test-specific state
});

/**
 * Custom matchers and utilities can be added here
 * Example:
 * expect.extend({
 *   toBeValidDiscordId(received) { ... }
 * });
 */
