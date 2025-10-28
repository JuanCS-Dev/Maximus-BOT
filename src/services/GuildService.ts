import { injectable } from 'inversify';
import { Guild, GuildSettings } from '@prisma/client';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import {
  getCached,
  setCached,
  deleteCached,
  CacheKeys,
  CacheTTL,
} from '../cache/redis';
import type { IGuildService } from '../types/container';

/**
 * Guild Service
 * Manages guild (server) data with caching
 */
@injectable()
export class GuildService implements IGuildService {
  /**
   * Get or create a guild in the database
   */
  async getOrCreateGuild(
    guildId: string,
    guildName: string,
    iconUrl?: string
  ): Promise<Guild> {
    try {
      // Try to get from database
      let guild = await prisma.guild.findUnique({
        where: { id: guildId },
      });

      if (!guild) {
        // Create new guild
        guild = await prisma.guild.create({
          data: {
            id: guildId,
            name: guildName,
            iconUrl: iconUrl || null,
          },
        });

        // Create default settings
        await prisma.guildSettings.create({
          data: {
            guildId: guild.id,
          },
        });

        logger.info(`Created new guild: ${guildName} (${guildId})`);
      } else if (guild.name !== guildName || guild.iconUrl !== iconUrl) {
        // Update guild info if changed
        guild = await prisma.guild.update({
          where: { id: guildId },
          data: {
            name: guildName,
            iconUrl: iconUrl || null,
          },
        });
      }

      return guild;
    } catch (error) {
      logger.error(`Error in getOrCreateGuild for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Get guild settings with caching
   */
  async getGuildSettings(guildId: string): Promise<GuildSettings> {
    try {
      // Try cache first
      const cacheKey = CacheKeys.GUILD_SETTINGS(guildId);
      const cached = await getCached<GuildSettings>(cacheKey);

      if (cached) {
        return cached;
      }

      // Get from database
      let settings = await prisma.guildSettings.findUnique({
        where: { guildId },
      });

      // Create if not exists
      if (!settings) {
        settings = await prisma.guildSettings.create({
          data: { guildId },
        });
        logger.debug(`Created default settings for guild ${guildId}`);
      }

      // Cache for future requests
      await setCached(cacheKey, settings, CacheTTL.GUILD_SETTINGS);

      return settings;
    } catch (error) {
      logger.error(`Error in getGuildSettings for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Update guild settings
   */
  async updateGuildSettings(
    guildId: string,
    data: Partial<Omit<GuildSettings, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<GuildSettings> {
    try {
      const settings = await prisma.guildSettings.update({
        where: { guildId },
        data,
      });

      // Invalidate cache
      const cacheKey = CacheKeys.GUILD_SETTINGS(guildId);
      await deleteCached(cacheKey);

      logger.info(`Updated settings for guild ${guildId}`);
      return settings;
    } catch (error) {
      logger.error(`Error in updateGuildSettings for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Delete guild and all related data
   */
  async deleteGuild(guildId: string): Promise<void> {
    try {
      await prisma.guild.delete({
        where: { id: guildId },
      });

      // Invalidate cache
      const cacheKey = CacheKeys.GUILD_SETTINGS(guildId);
      await deleteCached(cacheKey);

      logger.info(`Deleted guild ${guildId} and all related data`);
    } catch (error) {
      logger.error(`Error in deleteGuild for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Get guild by ID
   */
  async getGuild(guildId: string): Promise<Guild | null> {
    try {
      return await prisma.guild.findUnique({
        where: { id: guildId },
      });
    } catch (error) {
      logger.error(`Error in getGuild for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Update guild info (name, icon)
   */
  async updateGuild(
    guildId: string,
    data: { name?: string; iconUrl?: string }
  ): Promise<Guild> {
    try {
      const guild = await prisma.guild.update({
        where: { id: guildId },
        data,
      });

      logger.debug(`Updated guild info for ${guildId}`);
      return guild;
    } catch (error) {
      logger.error(`Error in updateGuild for ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Sync multiple guilds (useful for bot startup)
   */
  async syncGuilds(
    guilds: Array<{ id: string; name: string; iconUrl?: string }>
  ): Promise<void> {
    try {
      for (const guild of guilds) {
        await this.getOrCreateGuild(guild.id, guild.name, guild.iconUrl);
      }
      logger.info(`Synced ${guilds.length} guilds with database`);
    } catch (error) {
      logger.error('Error in syncGuilds:', error);
      throw error;
    }
  }
}
