import { injectable } from 'inversify';
import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
} from 'discord.js';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import type { IIncidentResponseService } from '../types/container';

/**
 * Incident Response Service
 *
 * Interactive alert system for security incidents with analyst workflows.
 * Integrates with Discord buttons for real-time threat response.
 *
 * Features:
 * - Interactive alerts with buttons (Ban, Timeout, Delete, Ignore)
 * - Alert status tracking and updates
 * - Analyst action logging
 * - SOC channel integration
 * - Incident case management
 *
 * Button Actions:
 * - 🚫 Ban User: Permanently ban user + delete messages (24h)
 * - ⏰ Timeout: 1-hour timeout + delete message
 * - 🗑️ Delete: Delete message only
 * - ✅ Ignore: Mark as false positive
 */
@injectable()
export class IncidentResponseService implements IIncidentResponseService {
  /**
   * Create interactive alert in SOC alerts channel
   *
   * @param client - Discord client
   * @param guildId - Guild ID
   * @param threat - Threat data
   * @returns Alert message ID
   *
   * Alert includes:
   * - Threat severity and score
   * - User information
   * - IOC details
   * - MISP/OpenCTI enrichment
   * - Action buttons
   */
  async createInteractiveAlert(
    client: Client,
    guildId: string,
    threat: ThreatAlertData
  ): Promise<string | null> {
    try {
      // Get SOC alerts channel from guild settings
      const guildSettings = await prisma.guildSettings.findUnique({
        where: { guildId },
      });

      const socChannelId =
        guildSettings?.modLogChannelId || process.env.SOC_ALERTS_CHANNEL_ID;

      if (!socChannelId) {
        logger.warn(`No SOC alerts channel configured for guild ${guildId}`);
        return null;
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        logger.warn(`Guild not found: ${guildId}`);
        return null;
      }

      const channel = guild.channels.cache.get(socChannelId) as TextChannel;
      if (!channel) {
        logger.warn(`SOC alerts channel not found: ${socChannelId}`);
        return null;
      }

      // Build alert embed
      const embed = this.buildAlertEmbed(threat);

      // Build action buttons
      const actionRow = this.buildActionButtons(
        threat.messageId,
        threat.userId
      );

      // Send alert
      const alertMessage = await channel.send({
        content: `🚨 **THREAT DETECTED** - Score: ${threat.threatScore}/100`,
        embeds: [embed],
        components: [actionRow],
      });

      logger.info(
        `Interactive alert created: ${alertMessage.id} (guild: ${guildId})`
      );

      return alertMessage.id;
    } catch (error: unknown) {
      logger.error(`Error creating interactive alert:`, error);
      return null;
    }
  }

  /**
   * Handle button interaction response
   *
   * @param interaction - Button interaction
   * @returns Success boolean
   *
   * Actions:
   * - ban: Ban user + delete messages
   * - timeout: Timeout user + delete message
   * - delete: Delete message only
   * - ignore: Mark as false positive
   */
  async handleInteractionResponse(
    interaction: ButtonInteraction
  ): Promise<boolean> {
    try {
      await interaction.deferReply({ ephemeral: true });

      const [action, messageId, userId] = interaction.customId.split(':');

      logger.info(
        `Handling interaction: ${action} for message ${messageId} (analyst: ${interaction.user.tag})`
      );

      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply({
          content: '❌ Guild not found',
        });
        return false;
      }

      let success = false;
      let responseMessage = '';

      switch (action) {
        case 'ban':
          success = await this.executeBan(guild, userId, interaction.user.id);
          responseMessage = success
            ? `✅ User <@${userId}> has been banned`
            : `❌ Failed to ban user`;
          break;

        case 'timeout':
          success = await this.executeTimeout(
            guild,
            userId,
            messageId,
            interaction.user.id
          );
          responseMessage = success
            ? `✅ User <@${userId}> has been timed out for 1 hour`
            : `❌ Failed to timeout user`;
          break;

        case 'delete':
          success = await this.executeDelete(
            guild,
            messageId,
            interaction.user.id
          );
          responseMessage = success
            ? `✅ Message deleted`
            : `❌ Failed to delete message`;
          break;

        case 'ignore':
          success = await this.executeIgnore(
            messageId,
            userId,
            interaction.user.id
          );
          responseMessage = `✅ Marked as false positive`;
          break;

        default:
          responseMessage = `❌ Unknown action: ${action}`;
      }

      await interaction.editReply({
        content: responseMessage,
      });

      // Update alert status
      await this.updateAlertStatus(
        interaction.message.id,
        action,
        interaction.user.tag,
        success
      );

      return success;
    } catch (error: unknown) {
      logger.error(`Error handling interaction response:`, error);
      return false;
    }
  }

  /**
   * Update alert status after analyst action
   *
   * @param alertMessageId - Alert message ID
   * @param action - Action taken
   * @param analyst - Analyst username
   * @param success - Whether action succeeded
   */
  async updateAlertStatus(
    alertMessageId: string,
    action: string,
    analyst: string,
    success: boolean
  ): Promise<void> {
    try {
      // Update alert embed to show action taken
      // This would require fetching the message and editing it
      // For now, just log the action

      logger.info(
        `Alert ${alertMessageId}: ${action} by ${analyst} (success: ${success})`
      );

      // Could update database record here if storing alert messages
    } catch (error: unknown) {
      logger.error(`Error updating alert status:`, error);
    }
  }

  /**
   * Build alert embed with threat details
   */
  private buildAlertEmbed(threat: ThreatAlertData): EmbedBuilder {
    const severityColor = this.getSeverityColor(threat.threatScore);
    const severityText = this.getSeverityText(threat.threatScore);

    const embed = new EmbedBuilder()
      .setTitle(`🚨 ${severityText} Threat Detected`)
      .setColor(severityColor)
      .setTimestamp();

    // Threat Overview
    embed.addFields({
      name: '📊 Threat Overview',
      value: [
        `**Type:** ${threat.threatType}`,
        `**Score:** ${threat.threatScore}/100`,
        `**Description:** ${threat.description}`,
      ].join('\n'),
    });

    // User Information
    embed.addFields({
      name: '👤 User Information',
      value: [
        `**User:** <@${threat.userId}>`,
        `**Username:** ${threat.username}`,
        `**User ID:** ${threat.userId}`,
      ].join('\n'),
    });

    // IOC Details
    if (threat.ioc) {
      embed.addFields({
        name: '🔍 Indicators of Compromise',
        value: [
          `**IOC:** \`${threat.ioc}\``,
          `**Type:** ${threat.iocType || 'unknown'}`,
          `**Source:** ${threat.detectionSource || 'automated'}`,
        ].join('\n'),
      });
    }

    // External Intelligence
    if (threat.mispEvent) {
      embed.addFields({
        name: '🌐 MISP Intelligence',
        value: [
          `**Event ID:** ${threat.mispEvent.id}`,
          `**Description:** ${threat.mispEvent.info}`,
          `**Threat Level:** ${this.mapMispThreatLevel(threat.mispEvent.threat_level_id)}`,
          `**Tags:** ${threat.mispEvent.tags.join(', ') || 'None'}`,
        ].join('\n'),
      });
    }

    if (threat.openCTIIndicator) {
      embed.addFields({
        name: '🧠 OpenCTI Intelligence',
        value: [
          `**Name:** ${threat.openCTIIndicator.name}`,
          `**Description:** ${threat.openCTIIndicator.description}`,
          `**Labels:** ${threat.openCTIIndicator.labels.join(', ') || 'None'}`,
        ].join('\n'),
      });
    }

    // Message Context
    embed.addFields({
      name: '📝 Message Context',
      value: [
        `**Message ID:** ${threat.messageId}`,
        `**Channel:** <#${threat.channelId}>`,
        `**Link:** [Jump to Message](https://discord.com/channels/${threat.guildId}/${threat.channelId}/${threat.messageId})`,
      ].join('\n'),
    });

    embed.setFooter({
      text: 'MAXIMUS Incident Response System',
    });

    return embed;
  }

  /**
   * Build action buttons for alert
   */
  private buildActionButtons(
    messageId: string,
    userId: string
  ): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ban:${messageId}:${userId}`)
        .setLabel('Ban User')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚫'),

      new ButtonBuilder()
        .setCustomId(`timeout:${messageId}:${userId}`)
        .setLabel('Timeout')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⏰'),

      new ButtonBuilder()
        .setCustomId(`delete:${messageId}:${userId}`)
        .setLabel('Delete Message')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗑️'),

      new ButtonBuilder()
        .setCustomId(`ignore:${messageId}:${userId}`)
        .setLabel('Ignore (False Positive)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    return row;
  }

  /**
   * Execute ban action
   */
  private async executeBan(
    guild: any,
    userId: string,
    analystId: string
  ): Promise<boolean> {
    try {
      const member = guild.members.cache.get(userId);

      if (!member) {
        logger.warn(`Member not found: ${userId}`);
        return false;
      }

      if (!member.bannable) {
        logger.warn(`Cannot ban member: ${userId} (insufficient permissions)`);
        return false;
      }

      await member.ban({
        reason: `Incident Response: Threat detected (analyst: ${analystId})`,
        deleteMessageSeconds: 86400, // 24 hours
      });

      logger.info(`User banned: ${userId} by analyst ${analystId}`);
      return true;
    } catch (error: unknown) {
      logger.error(`Error executing ban:`, error);
      return false;
    }
  }

  /**
   * Execute timeout action
   */
  private async executeTimeout(
    guild: any,
    userId: string,
    messageId: string,
    analystId: string
  ): Promise<boolean> {
    try {
      const member = guild.members.cache.get(userId) as GuildMember;

      if (!member) {
        logger.warn(`Member not found: ${userId}`);
        return false;
      }

      if (!member.moderatable) {
        logger.warn(
          `Cannot timeout member: ${userId} (insufficient permissions)`
        );
        return false;
      }

      // Timeout for 1 hour
      await member.timeout(
        60 * 60 * 1000,
        `Incident Response: Threat detected (analyst: ${analystId})`
      );

      // Also delete the message
      await this.deleteMessageById(guild, messageId);

      logger.info(`User timed out: ${userId} by analyst ${analystId}`);
      return true;
    } catch (error: unknown) {
      logger.error(`Error executing timeout:`, error);
      return false;
    }
  }

  /**
   * Execute delete message action
   */
  private async executeDelete(
    guild: any,
    messageId: string,
    analystId: string
  ): Promise<boolean> {
    try {
      const deleted = await this.deleteMessageById(guild, messageId);

      if (deleted) {
        logger.info(`Message deleted: ${messageId} by analyst ${analystId}`);
      }

      return deleted;
    } catch (error: unknown) {
      logger.error(`Error executing delete:`, error);
      return false;
    }
  }

  /**
   * Execute ignore action (mark as false positive)
   */
  private async executeIgnore(
    messageId: string,
    _userId: string,
    analystId: string
  ): Promise<boolean> {
    try {
      // Update threat detection record in database
      await prisma.threatDetection.updateMany({
        where: { messageId },
        data: {
          actionTaken: 'false_positive',
          metadata: {
            analyst: analystId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      logger.info(
        `Threat marked as false positive: ${messageId} by analyst ${analystId}`
      );
      return true;
    } catch (error: unknown) {
      logger.error(`Error executing ignore:`, error);
      return false;
    }
  }

  /**
   * Delete message by ID (search across channels)
   */
  private async deleteMessageById(
    guild: any,
    messageId: string
  ): Promise<boolean> {
    try {
      // Find message across all text channels
      for (const [, channel] of guild.channels.cache) {
        if (channel.isTextBased()) {
          try {
            const message = await (channel as TextChannel).messages.fetch(
              messageId
            );
            if (message && message.deletable) {
              await message.delete();
              return true;
            }
          } catch {
            // Message not in this channel, continue
            continue;
          }
        }
      }

      logger.warn(`Message not found or not deletable: ${messageId}`);
      return false;
    } catch (error: unknown) {
      logger.error(`Error deleting message:`, error);
      return false;
    }
  }

  /**
   * Get severity color based on threat score
   */
  private getSeverityColor(score: number): number {
    if (score >= 90) return 0x8b0000; // Dark red (Critical)
    if (score >= 80) return 0xff0000; // Red (High)
    if (score >= 50) return 0xff8c00; // Orange (Medium)
    return 0xffff00; // Yellow (Low)
  }

  /**
   * Get severity text based on threat score
   */
  private getSeverityText(score: number): string {
    if (score >= 90) return 'CRITICAL';
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Map MISP threat level to text
   */
  private mapMispThreatLevel(levelId: string): string {
    switch (levelId) {
      case '1':
        return 'High';
      case '2':
        return 'Medium';
      case '3':
        return 'Low';
      case '4':
        return 'Undefined';
      default:
        return 'Unknown';
    }
  }
}

/**
 * Type Definitions
 */

export interface ThreatAlertData {
  guildId: string;
  channelId: string;
  messageId: string;
  userId: string;
  username: string;
  threatType: string;
  threatScore: number;
  description: string;
  ioc?: string;
  iocType?: string;
  detectionSource?: string;
  mispEvent?: {
    id: string;
    info: string;
    threat_level_id: string;
    tags: string[];
  };
  openCTIIndicator?: {
    id: string;
    name: string;
    description: string;
    labels: string[];
  };
}
