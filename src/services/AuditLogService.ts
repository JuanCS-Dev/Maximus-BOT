import { injectable } from 'inversify';
import { AuditLog, AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import type { IAuditLogService } from '../types/container';

/**
 * Audit Log Service
 * Tracks all moderation actions for accountability
 */
@injectable()
export class AuditLogService implements IAuditLogService {
  /**
   * Log a moderation action
   */
  async logAction(
    guildId: string,
    targetUserId: string,
    action: AuditAction,
    moderatorId: string,
    moderatorTag: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          guildId,
          targetUserId,
          action,
          moderatorId,
          moderatorTag,
          reason: reason ?? undefined,
          metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });

      logger.debug(
        `Audit log created: ${action} on user ${targetUserId} by ${moderatorTag}`
      );

      return auditLog;
    } catch (error) {
      logger.error(`Error in logAction:`, error);
      throw error;
    }
  }

  /**
   * Get audit logs for a guild with optional filters
   */
  async getAuditLogs(
    guildId: string,
    filters?: {
      action?: AuditAction;
      targetUserId?: string;
      moderatorId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLog[]> {
    try {
      const where: {
        guildId: string;
        action?: AuditAction;
        targetUserId?: string;
        moderatorId?: string;
      } = { guildId };

      if (filters?.action) {
        where.action = filters.action;
      }

      if (filters?.targetUserId) {
        where.targetUserId = filters.targetUserId;
      }

      if (filters?.moderatorId) {
        where.moderatorId = filters.moderatorId;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return logs;
    } catch (error) {
      logger.error(`Error in getAuditLogs:`, error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    guildId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          targetUserId: userId,
          guildId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error(`Error in getUserAuditLogs:`, error);
      throw error;
    }
  }

  /**
   * Get recent actions by a moderator
   */
  async getModeratorActions(
    moderatorId: string,
    guildId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          moderatorId,
          guildId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error(`Error in getModeratorActions:`, error);
      throw error;
    }
  }

  /**
   * Get statistics for a guild
   */
  async getGuildStats(guildId: string): Promise<{
    totalActions: number;
    actionsByType: Record<AuditAction, number>;
  }> {
    try {
      const totalActions = await prisma.auditLog.count({
        where: { guildId },
      });

      // Get counts by action type
      const actionCounts = await prisma.auditLog.groupBy({
        by: ['action'],
        where: { guildId },
        _count: {
          action: true,
        },
      });

      const actionsByType: Record<AuditAction, number> = {} as Record<AuditAction, number>;
      for (const item of actionCounts) {
        actionsByType[item.action] = item._count.action;
      }

      return {
        totalActions,
        actionsByType,
      };
    } catch (error) {
      logger.error(`Error in getGuildStats:`, error);
      throw error;
    }
  }

  /**
   * Delete old audit logs (for GDPR compliance or cleanup)
   */
  async deleteOldLogs(
    guildId: string,
    olderThanDays: number
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          guildId,
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(
        `Deleted ${result.count} audit logs older than ${olderThanDays} days for guild ${guildId}`
      );

      return result.count;
    } catch (error) {
      logger.error(`Error in deleteOldLogs:`, error);
      throw error;
    }
  }
}
