import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global setup and teardown
    setupFiles: ['./tests/setup.ts'],

    // Coverage configuration - 90% threshold (rigoroso)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/types/**',
        'vitest.config.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },

    // Globals (para usar describe, it, expect sem import)
    globals: true,

    // Timeout para testes (alguns podem demorar por causa de DB)
    testTimeout: 30000,

    // Retry flaky tests
    retry: 1,

    // Pool options para testes paralelos
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // Mock config
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Include/exclude patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
