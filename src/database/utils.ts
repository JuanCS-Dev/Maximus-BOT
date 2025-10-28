import { Guild, User, GuildSettings } from '@prisma/client';
import { prisma } from './client';
import { logger } from '../utils/logger';

/**
 * Get or create a guild in the database
 */
export async function getOrCreateGuild(guildId: string, guildName: string, iconUrl?: string): Promise<Guild> {
  try {
    let guild = await prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      guild = await prisma.guild.create({
        data: {
          id: guildId,
          name: guildName,
          iconUrl: iconUrl || null,
        },
      });

      // Create default settings for new guild
      await prisma.guildSettings.create({
        data: {
          guildId: guild.id,
        },
      });

      logger.info(`Created new guild in database: ${guildName} (${guildId})`);
    }

    return guild;
  } catch (error) {
    logger.error(`Error getting/creating guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Get or create a user in the database
 */
export async function getOrCreateUser(
  userId: string,
  username: string,
  discriminator: string,
  avatarUrl?: string,
  isBot = false
): Promise<User> {
  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          username,
          discriminator,
          avatarUrl: avatarUrl || null,
          isBot,
        },
      });

      logger.debug(`Created new user in database: ${username}#${discriminator}`);
    }

    return user;
  } catch (error) {
    logger.error(`Error getting/creating user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get guild settings (creates if not exists)
 */
export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  try {
    let settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    if (!settings) {
      settings = await prisma.guildSettings.create({
        data: { guildId },
      });
      logger.debug(`Created default settings for guild ${guildId}`);
    }

    return settings;
  } catch (error) {
    logger.error(`Error getting guild settings for ${guildId}:`, error);
    throw error;
  }
}

/**
 * Update guild settings
 */
export async function updateGuildSettings(
  guildId: string,
  data: Partial<Omit<GuildSettings, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
): Promise<GuildSettings> {
  try {
    const settings = await prisma.guildSettings.update({
      where: { guildId },
      data,
    });

    logger.debug(`Updated settings for guild ${guildId}`);
    return settings;
  } catch (error) {
    logger.error(`Error updating guild settings for ${guildId}:`, error);
    throw error;
  }
}

/**
 * Delete guild and all related data
 */
export async function deleteGuild(guildId: string): Promise<void> {
  try {
    await prisma.guild.delete({
      where: { id: guildId },
    });
    logger.info(`Deleted guild ${guildId} and all related data`);
  } catch (error) {
    logger.error(`Error deleting guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Get active warnings count for a user in a guild
 */
export async function getActiveWarningsCount(userId: string, guildId: string): Promise<number> {
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
    logger.error(`Error getting warnings count for user ${userId} in guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Batch update - sync multiple guilds at once
 * Useful for bot startup to ensure all guilds are in database
 */
export async function syncGuilds(guilds: Array<{ id: string; name: string; iconUrl?: string }>): Promise<void> {
  try {
    for (const guild of guilds) {
      await getOrCreateGuild(guild.id, guild.name, guild.iconUrl);
    }
    logger.info(`Synced ${guilds.length} guilds with database`);
  } catch (error) {
    logger.error('Error syncing guilds:', error);
    throw error;
  }
}
