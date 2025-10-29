import { Events, Message } from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { GamificationService } from '../services/GamificationService';
import { logger } from '../utils/logger';

/**
 * Message Create - Gamification XP Awards
 *
 * Phase 6.2: Gamification System
 *
 * Awards XP for messages and handles level-ups
 */

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    try {
      const gamificationService = getService<GamificationService>(TYPES.GamificationService);

      // Award XP
      const result = await gamificationService.awardMessageXP(
        message.author.id,
        message.guild.id,
        message.author.username
      );

      // Handle level up
      if (result && result.leveledUp) {
        await gamificationService.sendLevelUpNotification(
          message.client,
          message.guild.id,
          message.channelId,
          message.author.id,
          message.author.username,
          result.newLevel,
          result.badgesUnlocked
        );

        logger.info('User leveled up', {
          userId: message.author.id,
          username: message.author.username,
          guildId: message.guild.id,
          newLevel: result.newLevel,
          badgesUnlocked: result.badgesUnlocked.length,
        });
      }
    } catch (error) {
      logger.error('Error in message gamification handler:', error);
    }
  },
};
