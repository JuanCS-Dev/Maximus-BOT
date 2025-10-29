/**
 * Prisma Client Mock
 * Mock implementation for Prisma database client
 */

import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

/**
 * Create a mock Prisma client with all models
 */
export function createMockPrismaClient(): Partial<PrismaClient> {
  return {
    // Guild model
    guild: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    } as any,

    // GuildSettings model
    guildSettings: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    } as any,

    // User model
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    } as any,

    // Warning model
    warning: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    } as any,

    // AuditLog model
    auditLog: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    } as any,

    // CustomCommand model
    customCommand: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any,

    // ReactionRole model
    reactionRole: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any,

    // Connection management
    $connect: vi.fn(async () => {}),
    $disconnect: vi.fn(async () => {}),
    $on: vi.fn(),
    $transaction: vi.fn(async (callback: any) => callback(createMockPrismaClient())),
  } as Partial<PrismaClient>;
}

/**
 * Mock Prisma module
 */
export const mockPrisma = createMockPrismaClient();

/**
 * Reset all Prisma mocks
 */
export function resetPrismaMocks() {
  vi.clearAllMocks();
}
