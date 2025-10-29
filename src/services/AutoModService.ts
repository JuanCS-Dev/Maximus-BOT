import { injectable } from 'inversify';
import {
  Guild,
  AutoModerationRule,
  AutoModerationRuleTriggerType,
  AutoModerationRuleEventType,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
} from 'discord.js';
import { logger } from '../utils/logger';
import { prisma } from '../database/client';

/**
 * AutoModService - Discord AutoMod v2 API Integration
 *
 * Phase 6.1.3: Native Discord AutoMod
 *
 * Features:
 * - ML-based content filtering (profanity, sexual content, slurs)
 * - Mention spam protection
 * - Keyword blocking
 * - Custom regex rules
 * - Integration with bot's threat detection system
 *
 * Discord AutoMod is FREE and runs on Discord's servers (no bot CPU usage!)
 */

export interface AutoModConfig {
  // Keyword Filtering
  enableKeywordFilter: boolean;
  blockedKeywords: string[];
  allowList: string[];

  // Preset Filters (Discord ML)
  enableProfanityFilter: boolean;
  enableSexualContentFilter: boolean;
  enableSlursFilter: boolean;

  // Spam Protection
  enableMentionSpamProtection: boolean;
  maxMentions: number;

  // Actions
  blockMessage: boolean;
  sendAlertToChannel: string | null; // Channel ID for alerts
  timeoutDuration: number | null; // Seconds (60-2592000)
}

@injectable()
export class AutoModService {
  /**
   * Setup comprehensive AutoMod rules for a guild
   * Creates all necessary AutoMod rules based on config
   */
  async setupAutoModRules(guild: Guild, config: AutoModConfig): Promise<void> {
    try {
      logger.info(`Setting up AutoMod rules for guild ${guild.name} (${guild.id})`);

      // Fetch existing rules to avoid duplicates
      const existingRules = await guild.autoModerationRules.fetch();
      const rulesByName = new Map(existingRules.map(rule => [rule.name, rule]));

      // 1. Keyword Filter Rule
      if (config.enableKeywordFilter && config.blockedKeywords.length > 0) {
        await this.createOrUpdateKeywordRule(guild, rulesByName, config);
      }

      // 2. ML-Based Content Filters (Presets)
      if (config.enableProfanityFilter || config.enableSexualContentFilter || config.enableSlursFilter) {
        await this.createOrUpdatePresetFilters(guild, rulesByName, config);
      }

      // 3. Mention Spam Protection
      if (config.enableMentionSpamProtection) {
        await this.createOrUpdateMentionSpamRule(guild, rulesByName, config);
      }

      logger.info(`AutoMod rules setup completed for ${guild.name}`);
    } catch (error) {
      logger.error('Error setting up AutoMod rules:', error);
      throw error;
    }
  }

  /**
   * Create or update keyword blocking rule
   */
  private async createOrUpdateKeywordRule(
    guild: Guild,
    existingRules: Map<string, AutoModerationRule>,
    config: AutoModConfig
  ): Promise<void> {
    const ruleName = 'Vértice - Keyword Filter';
    const existing = existingRules.get(ruleName);

    const ruleData = {
      name: ruleName,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        keywordFilter: config.blockedKeywords,
        allowList: config.allowList,
      },
      actions: this.buildActions(config),
      enabled: true,
    };

    if (existing) {
      await existing.edit(ruleData);
      logger.info(`Updated keyword filter rule: ${ruleName}`);
    } else {
      await guild.autoModerationRules.create(ruleData);
      logger.info(`Created keyword filter rule: ${ruleName}`);
    }
  }

  /**
   * Create or update ML-based preset filters
   * Uses Discord's trained models (no manual keyword lists needed!)
   */
  private async createOrUpdatePresetFilters(
    guild: Guild,
    existingRules: Map<string, AutoModerationRule>,
    config: AutoModConfig
  ): Promise<void> {
    const presets: AutoModerationRuleKeywordPresetType[] = [];

    if (config.enableProfanityFilter) {
      presets.push(AutoModerationRuleKeywordPresetType.Profanity);
    }
    if (config.enableSexualContentFilter) {
      presets.push(AutoModerationRuleKeywordPresetType.SexualContent);
    }
    if (config.enableSlursFilter) {
      presets.push(AutoModerationRuleKeywordPresetType.Slurs);
    }

    if (presets.length === 0) return;

    const ruleName = 'Vértice - Content Filter (ML)';
    const existing = existingRules.get(ruleName);

    const ruleData = {
      name: ruleName,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        presets,
      },
      actions: this.buildActions(config),
      enabled: true,
    };

    if (existing) {
      await existing.edit(ruleData);
      logger.info(`Updated ML content filter rule with presets: ${presets.join(', ')}`);
    } else {
      await guild.autoModerationRules.create(ruleData);
      logger.info(`Created ML content filter rule with presets: ${presets.join(', ')}`);
    }
  }

  /**
   * Create or update mention spam protection rule
   * Blocks messages with excessive @mentions
   */
  private async createOrUpdateMentionSpamRule(
    guild: Guild,
    existingRules: Map<string, AutoModerationRule>,
    config: AutoModConfig
  ): Promise<void> {
    const ruleName = 'Vértice - Mention Spam Protection';
    const existing = existingRules.get(ruleName);

    const ruleData = {
      name: ruleName,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: {
        mentionTotalLimit: config.maxMentions,
      },
      actions: this.buildActions(config),
      enabled: true,
    };

    if (existing) {
      await existing.edit(ruleData);
      logger.info(`Updated mention spam rule: max ${config.maxMentions} mentions`);
    } else {
      await guild.autoModerationRules.create(ruleData);
      logger.info(`Created mention spam rule: max ${config.maxMentions} mentions`);
    }
  }

  /**
   * Build AutoMod actions based on config
   */
  private buildActions(config: AutoModConfig): any[] {
    const actions: any[] = [];

    // Block message action (always recommended)
    if (config.blockMessage) {
      actions.push({
        type: AutoModerationActionType.BlockMessage,
      });
    }

    // Send alert to moderation channel
    if (config.sendAlertToChannel) {
      actions.push({
        type: AutoModerationActionType.SendAlertMessage,
        metadata: {
          channelId: config.sendAlertToChannel,
        },
      });
    }

    // Timeout user
    if (config.timeoutDuration) {
      actions.push({
        type: AutoModerationActionType.Timeout,
        metadata: {
          durationSeconds: config.timeoutDuration,
        },
      });
    }

    return actions;
  }

  /**
   * Get default AutoMod configuration for new guilds
   */
  getDefaultConfig(modLogChannelId?: string): AutoModConfig {
    return {
      // Keywords
      enableKeywordFilter: true,
      blockedKeywords: [
        // Common threats (customize per guild)
        'discord.gg/fake',
        'free nitro',
        'http://malicious',
      ],
      allowList: [],

      // ML Presets (FREE!)
      enableProfanityFilter: true,
      enableSexualContentFilter: true,
      enableSlursFilter: true,

      // Spam
      enableMentionSpamProtection: true,
      maxMentions: 5,

      // Actions
      blockMessage: true,
      sendAlertToChannel: modLogChannelId || null,
      timeoutDuration: 300, // 5 minutes
    };
  }

  /**
   * Disable all AutoMod rules for a guild
   */
  async disableAutoMod(guild: Guild): Promise<void> {
    try {
      const rules = await guild.autoModerationRules.fetch();
      const verticeRules = rules.filter(rule => rule.name.startsWith('Vértice - '));

      for (const rule of verticeRules.values()) {
        await rule.setEnabled(false);
        logger.info(`Disabled AutoMod rule: ${rule.name}`);
      }

      logger.info(`Disabled ${verticeRules.size} AutoMod rules for ${guild.name}`);
    } catch (error) {
      logger.error('Error disabling AutoMod rules:', error);
      throw error;
    }
  }

  /**
   * Get AutoMod statistics for a guild
   */
  async getAutoModStats(guild: Guild): Promise<{
    totalRules: number;
    activeRules: number;
    ruleNames: string[];
  }> {
    try {
      const rules = await guild.autoModerationRules.fetch();
      const verticeRules = rules.filter(rule => rule.name.startsWith('Vértice - '));
      const activeRules = verticeRules.filter(rule => rule.enabled);

      return {
        totalRules: verticeRules.size,
        activeRules: activeRules.size,
        ruleNames: verticeRules.map(rule => rule.name),
      };
    } catch (error) {
      logger.error('Error fetching AutoMod stats:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        ruleNames: [],
      };
    }
  }

  /**
   * Handle AutoMod action execution event
   * Log to database and integrate with threat detection
   */
  async handleAutoModAction(
    guildId: string,
    userId: string,
    ruleName: string,
    content: string,
    action: string
  ): Promise<void> {
    try {
      // Create threat detection record
      await prisma.threatDetection.create({
        data: {
          guildId,
          userId,
          username: 'Unknown', // Will be updated by event handler
          messageId: null,
          threatType: 'automod_violation',
          threatScore: this.calculateThreatScore(ruleName),
          ioc: content.substring(0, 255), // Truncate to fit DB
          actionTaken: action,
          metadata: {
            ruleName,
            fullContent: content,
            autoModAction: action,
          },
        },
      });

      logger.info('AutoMod action logged to threat detection', {
        guildId,
        userId,
        ruleName,
        action,
      });
    } catch (error) {
      logger.error('Error logging AutoMod action:', error);
    }
  }

  /**
   * Calculate threat score based on rule type
   */
  private calculateThreatScore(ruleName: string): number {
    if (ruleName.includes('Slurs')) return 90;
    if (ruleName.includes('Sexual Content')) return 80;
    if (ruleName.includes('Profanity')) return 60;
    if (ruleName.includes('Mention Spam')) return 70;
    if (ruleName.includes('Keyword')) return 75;
    return 50; // Default
  }
}
