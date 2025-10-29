import { Events, AutoModerationActionExecution } from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { AutoModService } from '../services/AutoModService';
import { logger } from '../utils/logger';

/**
 * AutoMod Action Execution Event
 *
 * Phase 6.1.3: Discord AutoMod Integration
 *
 * Fired when Discord AutoMod takes an action
 * Integrates with our threat detection system for unified logging
 */

export default {
  name: Events.AutoModerationActionExecution,
  async execute(autoModAction: AutoModerationActionExecution) {
    try {
      const autoModService = getService<AutoModService>(TYPES.AutoModService);

      const { guild, user, ruleTriggerType, matchedContent, action, ruleId } = autoModAction;

      if (!user || !guild) {
        logger.warn('AutoMod action without user or guild context', {
          ruleId,
        });
        return;
      }

      // Fetch rule details if needed
      const rule = await guild.autoModerationRules.fetch(ruleId).catch(() => null);
      const ruleName = rule?.name || 'Unknown Rule';

      logger.info('AutoMod action executed', {
        guildId: guild.id,
        guildName: guild.name,
        userId: user.id,
        username: user.tag,
        ruleName,
        triggerType: ruleTriggerType,
        actionType: action.type,
        matchedContent: matchedContent?.substring(0, 100) || 'N/A',
      });

      // Log to threat detection system
      await autoModService.handleAutoModAction(
        guild.id,
        user.id,
        ruleName,
        matchedContent || '',
        action.type.toString()
      );
    } catch (error) {
      logger.error('Error handling AutoMod action execution:', error);
    }
  },
};
