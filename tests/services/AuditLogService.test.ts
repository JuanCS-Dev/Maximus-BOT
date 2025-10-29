/**
 * AuditLogService Unit Tests
 * Tests for audit log service with filtering and statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogService } from '@/services/AuditLogService';
import { createAuditLogFactory } from '@tests/helpers/factories';
import { AuditAction } from '@prisma/client';
import type { AuditLog } from '@prisma/client';

// Mock Prisma client
vi.mock('@/database/client', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
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

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    service = new AuditLogService();
    vi.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create audit log with all fields', async () => {
      const mockLog = createAuditLogFactory({
        guildId: '456',
        targetUserId: '123',
        action: AuditAction.BAN,
        moderatorId: '789',
        moderatorTag: 'Mod#1234',
        reason: 'Spam',
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockLog);

      const result = await service.logAction(
        '456',
        '123',
        AuditAction.BAN,
        '789',
        'Mod#1234',
        'Spam',
        { duration: '7d' }
      );

      expect(result).toEqual(mockLog);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          guildId: '456',
          targetUserId: '123',
          action: AuditAction.BAN,
          moderatorId: '789',
          moderatorTag: 'Mod#1234',
          reason: 'Spam',
          metadata: { duration: '7d' },
        },
      });
    });

    it('should create log without optional fields', async () => {
      const mockLog = createAuditLogFactory({
        action: AuditAction.KICK,
      });
      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockLog);

      await service.logAction('456', '123', AuditAction.KICK, '789', 'Mod#1234');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          guildId: '456',
          targetUserId: '123',
          action: AuditAction.KICK,
          moderatorId: '789',
          moderatorTag: 'Mod#1234',
          reason: undefined,
          metadata: undefined,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('Database error'));

      await expect(
        service.logAction('456', '123', AuditAction.BAN, '789', 'Mod')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAuditLogs', () => {
    it('should return logs for guild', async () => {
      const mockLogs = [
        createAuditLogFactory({ guildId: '456' }),
        createAuditLogFactory({ guildId: '456' }),
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('456');

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should filter by action type', async () => {
      const mockLogs = [createAuditLogFactory({ action: AuditAction.BAN })];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('456', { action: AuditAction.BAN });

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { guildId: '456', action: AuditAction.BAN },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should filter by target user', async () => {
      const mockLogs = [createAuditLogFactory({ targetUserId: '123' })];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('456', { targetUserId: '123' });

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { guildId: '456', targetUserId: '123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should filter by moderator', async () => {
      const mockLogs = [createAuditLogFactory({ moderatorId: '789' })];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('456', { moderatorId: '789' });

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { guildId: '456', moderatorId: '789' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should handle pagination', async () => {
      const mockLogs = [createAuditLogFactory()];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await service.getAuditLogs('456', { limit: 50, offset: 10 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 10,
      });
    });

    it('should handle combined filters', async () => {
      const mockLogs = [createAuditLogFactory()];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await service.getAuditLogs('456', {
        action: AuditAction.WARN,
        targetUserId: '123',
        moderatorId: '789',
        limit: 25,
        offset: 5,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          guildId: '456',
          action: AuditAction.WARN,
          targetUserId: '123',
          moderatorId: '789',
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 5,
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.findMany).mockRejectedValue(new Error('Database error'));

      await expect(service.getAuditLogs('456')).rejects.toThrow('Database error');
    });
  });

  describe('getUserAuditLogs', () => {
    it('should return logs for specific user', async () => {
      const mockLogs = [
        createAuditLogFactory({ targetUserId: '123', guildId: '456' }),
        createAuditLogFactory({ targetUserId: '123', guildId: '456' }),
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getUserAuditLogs('123', '456');

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { targetUserId: '123', guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit', async () => {
      const mockLogs = [createAuditLogFactory()];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await service.getUserAuditLogs('123', '456', 25);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { targetUserId: '123', guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.findMany).mockRejectedValue(new Error('Database error'));

      await expect(service.getUserAuditLogs('123', '456')).rejects.toThrow('Database error');
    });
  });

  describe('getModeratorActions', () => {
    it('should return logs for specific moderator', async () => {
      const mockLogs = [
        createAuditLogFactory({ moderatorId: '789', guildId: '456' }),
        createAuditLogFactory({ moderatorId: '789', guildId: '456' }),
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      const result = await service.getModeratorActions('789', '456');

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { moderatorId: '789', guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit', async () => {
      const mockLogs = [createAuditLogFactory()];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await service.getModeratorActions('789', '456', 30);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { moderatorId: '789', guildId: '456' },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.findMany).mockRejectedValue(new Error('Database error'));

      await expect(service.getModeratorActions('789', '456')).rejects.toThrow('Database error');
    });
  });

  describe('getGuildStats', () => {
    it('should return total actions count', async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);
      vi.mocked(prisma.auditLog.groupBy).mockResolvedValue([]);

      const result = await service.getGuildStats('456');

      expect(result.totalActions).toBe(100);
      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { guildId: '456' },
      });
    });

    it('should return actions by type', async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(150);
      vi.mocked(prisma.auditLog.groupBy).mockResolvedValue([
        { action: AuditAction.BAN, _count: { action: 50 } },
        { action: AuditAction.KICK, _count: { action: 30 } },
        { action: AuditAction.WARN, _count: { action: 70 } },
      ] as any);

      const result = await service.getGuildStats('456');

      expect(result.actionsByType).toEqual({
        [AuditAction.BAN]: 50,
        [AuditAction.KICK]: 30,
        [AuditAction.WARN]: 70,
      });
      expect(prisma.auditLog.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: { guildId: '456' },
        _count: { action: true },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.count).mockRejectedValue(new Error('Database error'));

      await expect(service.getGuildStats('456')).rejects.toThrow('Database error');
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      vi.mocked(prisma.auditLog.deleteMany).mockResolvedValue({ count: 25 });

      const result = await service.deleteOldLogs('456', 90);

      expect(result).toBe(25);
      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          guildId: '456',
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should calculate correct cutoff date', async () => {
      vi.mocked(prisma.auditLog.deleteMany).mockResolvedValue({ count: 10 });

      await service.deleteOldLogs('456', 30);

      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);

      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          guildId: '456',
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      const callArg = vi.mocked(prisma.auditLog.deleteMany).mock.calls[0][0];
      const cutoffDate = (callArg.where.createdAt as any).lt;
      const diffInDays = Math.floor(
        (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffInDays).toBe(30);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.auditLog.deleteMany).mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteOldLogs('456', 90)).rejects.toThrow('Delete failed');
    });
  });
});
