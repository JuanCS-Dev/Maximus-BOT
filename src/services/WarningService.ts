import { injectable } from 'inversify';
import { Warning } from '@prisma/client';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import {
  getCached,
  setCached,
  deleteCached,
  CacheKeys,
  CacheTTL,
} from '../cache/redis';
import type { IWarningService } from '../types/container';

/**
 * Warning Service
 * Manages user warnings with caching
 */
@injectable()
export class WarningService implements IWarningService {
  /**
   * Add a warning to a user
   */
  async addWarning(
    userId: string,
    guildId: string,
    moderatorId: string,
    moderatorTag: string,
    reason: string
  ): Promise<Warning> {
    try {
      const warning = await prisma.warning.create({
        data: {
          userId,
          guildId,
          moderatorId,
          moderatorTag,
          reason,
        },
      });

      // Invalidate cache
      const cacheKey = CacheKeys.USER_WARNINGS(userId, guildId);
      await deleteCached(cacheKey);

      logger.info(
        `Added warning to user ${userId} in guild ${guildId} by ${moderatorTag}`
      );

      return warning;
    } catch (error) {
      logger.error(`Error in addWarning:`, error);
      throw error;
    }
  }

  /**
   * Get all warnings for a user in a guild
   */
  async getWarnings(userId: string, guildId: string): Promise<Warning[]> {
    try {
      // Try cache first
      const cacheKey = CacheKeys.USER_WARNINGS(userId, guildId);
      const cached = await getCached<Warning[]>(cacheKey);

      if (cached) {
        return cached;
      }

      // Get from database
      const warnings = await prisma.warning.findMany({
        where: {
          userId,
          guildId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Cache for future requests
      await setCached(cacheKey, warnings, CacheTTL.USER_WARNINGS);

      return warnings;
    } catch (error) {
      logger.error(`Error in getWarnings:`, error);
      throw error;
    }
  }

  /**
   * Get count of active warnings for a user
   */
  async getActiveWarningsCount(
    userId: string,
    guildId: string
  ): Promise<number> {
    try {
      const count = await prisma.warning.count({
        where: {
          userId,
          guildId,
          active: true,
        },
      });

      return count;
    } catch (error) {
      logger.error(`Error in getActiveWarningsCount:`, error);
      throw error;
    }
  }

  /**
   * Clear all active warnings for a user
   */
  async clearWarnings(
    userId: string,
    guildId: string,
    clearedBy: string
  ): Promise<number> {
    try {
      const result = await prisma.warning.updateMany({
        where: {
          userId,
          guildId,
          active: true,
        },
        data: {
          active: false,
          clearedAt: new Date(),
          clearedBy,
        },
      });

      // Invalidate cache
      const cacheKey = CacheKeys.USER_WARNINGS(userId, guildId);
      await deleteCached(cacheKey);

      logger.info(
        `Cleared ${result.count} warnings for user ${userId} in guild ${guildId}`
      );

      return result.count;
    } catch (error) {
      logger.error(`Error in clearWarnings:`, error);
      throw error;
    }
  }

  /**
   * Clear a specific warning by ID
   */
  async clearWarning(warningId: string, clearedBy: string): Promise<void> {
    try {
      const warning = await prisma.warning.update({
        where: { id: warningId },
        data: {
          active: false,
          clearedAt: new Date(),
          clearedBy,
        },
      });

      // Invalidate cache
      const cacheKey = CacheKeys.USER_WARNINGS(warning.userId, warning.guildId);
      await deleteCached(cacheKey);

      logger.info(`Cleared warning ${warningId}`);
    } catch (error) {
      logger.error(`Error in clearWarning:`, error);
      throw error;
    }
  }

  /**
   * Get a specific warning by ID
   */
  async getWarningById(warningId: string): Promise<Warning | null> {
    try {
      return await prisma.warning.findUnique({
        where: { id: warningId },
      });
    } catch (error) {
      logger.error(`Error in getWarningById:`, error);
      throw error;
    }
  }

  /**
   * Delete a warning permanently
   */
  async deleteWarning(warningId: string): Promise<void> {
    try {
      const warning = await prisma.warning.delete({
        where: { id: warningId },
      });

      // Invalidate cache
      const cacheKey = CacheKeys.USER_WARNINGS(warning.userId, warning.guildId);
      await deleteCached(cacheKey);

      logger.info(`Deleted warning ${warningId}`);
    } catch (error) {
      logger.error(`Error in deleteWarning:`, error);
      throw error;
    }
  }
}
