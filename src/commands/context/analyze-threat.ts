import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { getService } from '../../container';
import { TYPES } from '../../types/container';
import { AIAssistantService } from '../../services/AIAssistantService';
import { logger } from '../../utils/logger';

/**
 * Context Menu: Analyze Threat
 *
 * Phase 6.1.2: Context Menus (Right-Click Actions)
 *
 * Usage: Right-click message → Apps → "Analyze Threat"
 *
 * Features:
 * - AI-powered threat analysis
 * - Phishing detection
 * - Toxicity scoring
 * - Instant feedback
 */

export const data = new ContextMenuCommandBuilder()
  .setName('Analyze Threat')
  .setType(ApplicationCommandType.Message)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.targetMessage;

    // Check if message has content
    if (!message.content && message.attachments.size === 0) {
      await interaction.editReply({
        content: '❌ Cannot analyze empty message (no content or attachments)',
      });
      return;
    }

    const aiAssistant = getService<AIAssistantService>(TYPES.AIAssistantService);

    if (!aiAssistant.isAvailable()) {
      await interaction.editReply({
        content: '❌ AI Assistant is not available (API key not configured)',
      });
      return;
    }

    // Analyze for phishing if message has content
    let phishingResult = null;
    let toxicityResult = null;

    if (message.content) {
      // Run both analyses in parallel
      [phishingResult, toxicityResult] = await Promise.all([
        aiAssistant.analyzePhishingMessage(message.content, {
          hasAttachments: message.attachments.size > 0,
          urls: Array.from(message.content.matchAll(/https?:\/\/[^\s]+/g)).map(m => m[0]),
        }),
        aiAssistant.analyzeToxicity(message.content, {
          authorUsername: message.author.username,
          channelName: message.channel && 'name' in message.channel ? (message.channel.name || 'unknown') : 'unknown',
        }),
      ]);
    }

    // Calculate overall threat score
    const phishingScore = phishingResult ? (phishingResult.confidence * (phishingResult.isPhishing ? 1 : 0)) : 0;
    const toxicityScore = toxicityResult ? toxicityResult.score : 0;
    const overallScore = Math.max(phishingScore, toxicityScore);

    // Determine color based on threat level
    const color =
      overallScore >= 80 ? 0xff0000 : // Red - Critical
      overallScore >= 50 ? 0xffa500 : // Orange - High
      overallScore >= 20 ? 0xffff00 : // Yellow - Medium
      0x00ff00; // Green - Low/Safe

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle('🔍 Threat Analysis Report')
      .setDescription(`Analysis of message from ${message.author.tag}`)
      .setColor(color)
      .addFields([
        {
          name: '📊 Overall Threat Score',
          value: `**${Math.round(overallScore)}/100**`,
          inline: true,
        },
        {
          name: '⚠️ Risk Level',
          value: overallScore >= 80 ? '🔴 Critical' :
                 overallScore >= 50 ? '🟠 High' :
                 overallScore >= 20 ? '🟡 Medium' :
                 '🟢 Low',
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        },
      ])
      .setFooter({
        text: 'Powered by Claude 3.5 Sonnet | Vértice Bot',
      })
      .setTimestamp();

    // Add phishing analysis
    if (phishingResult) {
      embed.addFields([
        {
          name: '🎣 Phishing Analysis',
          value: `**Is Phishing:** ${phishingResult.isPhishing ? '⚠️ YES' : '✅ No'}\n` +
                 `**Confidence:** ${phishingResult.confidence}%\n` +
                 `**Recommendation:** ${phishingResult.recommendation.toUpperCase()}`,
          inline: false,
        },
      ]);

      if (phishingResult.indicators && phishingResult.indicators.length > 0) {
        embed.addFields([
          {
            name: '🚩 Indicators',
            value: phishingResult.indicators.map(i => `• ${i}`).join('\n'),
            inline: false,
          },
        ]);
      }

      if (phishingResult.reasoning) {
        embed.addFields([
          {
            name: '💭 Reasoning',
            value: phishingResult.reasoning,
            inline: false,
          },
        ]);
      }
    }

    // Add toxicity analysis
    if (toxicityResult) {
      const categoriesText = Object.entries(toxicityResult.categories)
        .map(([key, value]) => `**${key}:** ${Math.round(value)}/100`)
        .join('\n');

      embed.addFields([
        {
          name: '☠️ Toxicity Analysis',
          value: `**Is Toxic:** ${toxicityResult.isToxic ? '⚠️ YES' : '✅ No'}\n` +
                 `**Overall Score:** ${Math.round(toxicityResult.score)}/100\n` +
                 `**Suggested Action:** ${toxicityResult.suggestedAction.toUpperCase()}`,
          inline: false,
        },
        {
          name: '📋 Categories Breakdown',
          value: categoriesText,
          inline: false,
        },
      ]);

      if (toxicityResult.reasoning) {
        embed.addFields([
          {
            name: '💭 AI Reasoning',
            value: toxicityResult.reasoning,
            inline: false,
          },
        ]);
      }
    }

    // Add message preview (truncated)
    if (message.content) {
      const preview = message.content.length > 200
        ? message.content.substring(0, 200) + '...'
        : message.content;

      embed.addFields([
        {
          name: '📝 Message Preview',
          value: `\`\`\`${preview}\`\`\``,
          inline: false,
        },
      ]);
    }

    await interaction.editReply({ embeds: [embed] });

    logger.info('Context menu: Analyze Threat executed', {
      userId: interaction.user.id,
      messageId: message.id,
      overallScore,
      isPhishing: phishingResult?.isPhishing,
      isToxic: toxicityResult?.isToxic,
    });
  } catch (error) {
    logger.error('Error in Analyze Threat context menu:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await interaction.editReply({
      content: `❌ Error analyzing threat: ${errorMessage}`,
    });
  }
}

export default { data, execute };
