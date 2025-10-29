/**
 * WarningService Unit Tests
 * Tests for warning management service with cache integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarningService } from '@/services/WarningService';
import { createWarningFactory } from '@tests/helpers/factories';
import type { Warning } from '@prisma/client';

// Mock Prisma client
vi.mock('@/database/client', () => ({
  prisma: {
    warning: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock Redis
vi.mock('@/cache/redis', () => ({
  getCached: vi.fn(),
  setCached: vi.fn(),
  deleteCached: vi.fn(),
  CacheKeys: {
    USER_WARNINGS: (userId: string, guildId: string) => `warnings:${userId}:${guildId}`,
  },
  CacheTTL: {
    USER_WARNINGS: 300,
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

import { prisma } from '@/database/client';
import { getCached, setCached, deleteCached } from '@/cache/redis';

describe('WarningService', () => {
  let service: WarningService;

  beforeEach(() => {
    service = new WarningService();
    vi.clearAllMocks();
  });

  describe('addWarning', () => {
    it('should create warning and invalidate cache', async () => {
      const mockWarning = createWarningFactory({
        userId: '123',
        guildId: '456',
        moderatorId: '789',
        moderatorTag: 'Mod#1234',
        reason: 'Test warning',
      });
      vi.mocked(prisma.warning.create).mockResolvedValue(mockWarning);

      const result = await service.addWarning('123', '456', '789', 'Mod#1234', 'Test warning');

      expect(result).toEqual(mockWarning);
      expect(prisma.warning.create).toHaveBeenCalledWith({
        data: {
          userId: '123',
          guildId: '456',
          moderatorId: '789',
          moderatorTag: 'Mod#1234',
          reason: 'Test warning',
        },
      });
      expect(deleteCached).toHaveBeenCalledWith('warnings:123:456');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.create).mockRejectedValue(new Error('Database error'));

      await expect(service.addWarning('123', '456', '789', 'Mod', 'Test')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getWarnings', () => {
    it('should return cached warnings if available', async () => {
      const mockWarnings = [
        createWarningFactory({ userId: '123', guildId: '456' }),
        createWarningFactory({ userId: '123', guildId: '456' }),
      ];
      vi.mocked(getCached).mockResolvedValue(mockWarnings);

      const result = await service.getWarnings('123', '456');

      expect(result).toEqual(mockWarnings);
      expect(getCached).toHaveBeenCalledWith('warnings:123:456');
      expect(prisma.warning.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const mockWarnings = [createWarningFactory({ userId: '123', guildId: '456' })];
      vi.mocked(getCached).mockResolvedValue(null);
      vi.mocked(prisma.warning.findMany).mockResolvedValue(mockWarnings);

      const result = await service.getWarnings('123', '456');

      expect(result).toEqual(mockWarnings);
      expect(prisma.warning.findMany).toHaveBeenCalledWith({
        where: {
          userId: '123',
          guildId: '456',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(setCached).toHaveBeenCalledWith('warnings:123:456', mockWarnings, 300);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getCached).mockRejectedValue(new Error('Redis error'));

      await expect(service.getWarnings('123', '456')).rejects.toThrow('Redis error');
    });
  });

  describe('getActiveWarningsCount', () => {
    it('should return count of active warnings', async () => {
      vi.mocked(prisma.warning.count).mockResolvedValue(3);

      const result = await service.getActiveWarningsCount('123', '456');

      expect(result).toBe(3);
      expect(prisma.warning.count).toHaveBeenCalledWith({
        where: {
          userId: '123',
          guildId: '456',
          active: true,
        },
      });
    });

    it('should return zero if no active warnings', async () => {
      vi.mocked(prisma.warning.count).mockResolvedValue(0);

      const result = await service.getActiveWarningsCount('123', '456');

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.count).mockRejectedValue(new Error('Database error'));

      await expect(service.getActiveWarningsCount('123', '456')).rejects.toThrow('Database error');
    });
  });

  describe('clearWarnings', () => {
    it('should clear warnings and return count', async () => {
      vi.mocked(prisma.warning.updateMany).mockResolvedValue({ count: 3 });

      const result = await service.clearWarnings('123', '456', 'admin789');

      expect(result).toBe(3);
      expect(prisma.warning.updateMany).toHaveBeenCalledWith({
        where: {
          userId: '123',
          guildId: '456',
          active: true,
        },
        data: {
          active: false,
          clearedAt: expect.any(Date),
          clearedBy: 'admin789',
        },
      });
    });

    it('should invalidate cache', async () => {
      vi.mocked(prisma.warning.updateMany).mockResolvedValue({ count: 2 });

      await service.clearWarnings('123', '456', 'admin');

      expect(deleteCached).toHaveBeenCalledWith('warnings:123:456');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.updateMany).mockRejectedValue(new Error('Update failed'));

      await expect(service.clearWarnings('123', '456', 'admin')).rejects.toThrow('Update failed');
    });
  });

  describe('clearWarning', () => {
    it('should clear specific warning', async () => {
      const mockWarning = createWarningFactory({
        id: 'warn123',
        userId: '123',
        guildId: '456',
      });
      vi.mocked(prisma.warning.update).mockResolvedValue(mockWarning);

      await service.clearWarning('warn123', 'admin789');

      expect(prisma.warning.update).toHaveBeenCalledWith({
        where: { id: 'warn123' },
        data: {
          active: false,
          clearedAt: expect.any(Date),
          clearedBy: 'admin789',
        },
      });
    });

    it('should invalidate cache', async () => {
      const mockWarning = createWarningFactory({
        id: 'warn123',
        userId: '123',
        guildId: '456',
      });
      vi.mocked(prisma.warning.update).mockResolvedValue(mockWarning);

      await service.clearWarning('warn123', 'admin');

      expect(deleteCached).toHaveBeenCalledWith('warnings:123:456');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.update).mockRejectedValue(new Error('Update failed'));

      await expect(service.clearWarning('warn123', 'admin')).rejects.toThrow('Update failed');
    });
  });

  describe('getWarningById', () => {
    it('should return warning if found', async () => {
      const mockWarning = createWarningFactory({ id: 'warn123' });
      vi.mocked(prisma.warning.findUnique).mockResolvedValue(mockWarning);

      const result = await service.getWarningById('warn123');

      expect(result).toEqual(mockWarning);
      expect(prisma.warning.findUnique).toHaveBeenCalledWith({
        where: { id: 'warn123' },
      });
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.warning.findUnique).mockResolvedValue(null);

      const result = await service.getWarningById('warn123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.findUnique).mockRejectedValue(new Error('Database error'));

      await expect(service.getWarningById('warn123')).rejects.toThrow('Database error');
    });
  });

  describe('deleteWarning', () => {
    it('should delete warning', async () => {
      const mockWarning = createWarningFactory({
        id: 'warn123',
        userId: '123',
        guildId: '456',
      });
      vi.mocked(prisma.warning.delete).mockResolvedValue(mockWarning);

      await service.deleteWarning('warn123');

      expect(prisma.warning.delete).toHaveBeenCalledWith({
        where: { id: 'warn123' },
      });
    });

    it('should invalidate cache', async () => {
      const mockWarning = createWarningFactory({
        id: 'warn123',
        userId: '123',
        guildId: '456',
      });
      vi.mocked(prisma.warning.delete).mockResolvedValue(mockWarning);

      await service.deleteWarning('warn123');

      expect(deleteCached).toHaveBeenCalledWith('warnings:123:456');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.warning.delete).mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteWarning('warn123')).rejects.toThrow('Delete failed');
    });
  });
});
