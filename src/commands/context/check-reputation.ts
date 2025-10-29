import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  UserContextMenuCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '../../database/client';
import { logger } from '../../utils/logger';

/**
 * Context Menu: Check Reputation
 *
 * Phase 6.1.2: Context Menus (Right-Click Actions)
 *
 * Usage: Right-click user → Apps → "Check Reputation"
 *
 * Features:
 * - View user's threat history
 * - See warnings and moderation actions
 * - Account age verification
 * - Quick reputation summary
 */

export const data = new ContextMenuCommandBuilder()
  .setName('Check Reputation')
  .setType(ApplicationCommandType.User)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: UserContextMenuCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.targetUser;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server',
      });
      return;
    }

    // Fetch user data from database
    const [threats, warnings, moderationActions, member] = await Promise.all([
      // Threat detections
      prisma.threatDetection.findMany({
        where: {
          guildId,
          userId: targetUser.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Warnings
      prisma.warning.findMany({
        where: {
          guildId,
          userId: targetUser.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Moderation actions from audit logs
      prisma.auditLog.findMany({
        where: {
          guildId,
          targetUserId: targetUser.id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Guild member info
      interaction.guild?.members.fetch(targetUser.id).catch(() => null),
    ]);

    // Calculate reputation score
    const threatScore = threats.reduce((sum: number, t: any) => sum + t.threatScore, 0);
    const avgThreatScore = threats.length > 0 ? threatScore / threats.length : 0;
    const warningCount = warnings.length;
    const moderationCount = moderationActions.length;

    // Reputation formula: 100 - (avg threat + warnings*10 + moderations*20)
    const reputationScore = Math.max(
      0,
      100 - avgThreatScore - (warningCount * 10) - (moderationCount * 20)
    );

    // Determine reputation level
    const reputationLevel =
      reputationScore >= 90 ? { emoji: '🟢', text: 'Excellent', color: 0x00ff00 } :
      reputationScore >= 70 ? { emoji: '🟡', text: 'Good', color: 0xffff00 } :
      reputationScore >= 50 ? { emoji: '🟠', text: 'Questionable', color: 0xffa500 } :
      { emoji: '🔴', text: 'Poor', color: 0xff0000 };

    // Account age
    const accountAge = Date.now() - targetUser.createdTimestamp;
    const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
    const isNewAccount = accountAgeDays < 7;

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(`👤 Reputation Check: ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(reputationLevel.color)
      .addFields([
        {
          name: '📊 Reputation Score',
          value: `**${Math.round(reputationScore)}/100** ${reputationLevel.emoji}`,
          inline: true,
        },
        {
          name: '⭐ Status',
          value: `${reputationLevel.emoji} ${reputationLevel.text}`,
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        },
        {
          name: '📅 Account Age',
          value: `${accountAgeDays} days ${isNewAccount ? '⚠️ (New Account)' : ''}`,
          inline: true,
        },
        {
          name: '🆔 User ID',
          value: `\`${targetUser.id}\``,
          inline: true,
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true,
        },
      ])
      .setFooter({
        text: 'Vértice Bot Security System',
      })
      .setTimestamp();

    // Add threat summary
    if (threats.length > 0) {
      const threatTypes = threats.map((t: any) => t.threatType);
      const uniqueThreatTypes = [...new Set(threatTypes)];
      const avgScore = Math.round(avgThreatScore);

      embed.addFields([
        {
          name: '⚠️ Threat Detections',
          value: `**Total:** ${threats.length}\n` +
                 `**Avg Score:** ${avgScore}/100\n` +
                 `**Types:** ${uniqueThreatTypes.join(', ')}`,
          inline: false,
        },
      ]);

      // Show recent threats
      const recentThreats = threats.slice(0, 3);
      if (recentThreats.length > 0) {
        const threatsText = recentThreats.map((t: any) =>
          `• ${t.threatType} (${t.threatScore}/100) - <t:${Math.floor(t.createdAt.getTime() / 1000)}:R>`
        ).join('\n');

        embed.addFields([
          {
            name: '🕐 Recent Threats',
            value: threatsText,
            inline: false,
          },
        ]);
      }
    } else {
      embed.addFields([
        {
          name: '⚠️ Threat Detections',
          value: '✅ No threats detected',
          inline: false,
        },
      ]);
    }

    // Add warnings summary
    if (warnings.length > 0) {
      const recentWarnings = warnings.slice(0, 3);
      const warningsText = recentWarnings.map((w: any) =>
        `• ${w.reason} - <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`
      ).join('\n');

      embed.addFields([
        {
          name: `⚠️ Warnings (${warnings.length})`,
          value: warningsText,
          inline: false,
        },
      ]);
    } else {
      embed.addFields([
        {
          name: '⚠️ Warnings',
          value: '✅ No warnings issued',
          inline: false,
        },
      ]);
    }

    // Add moderation actions summary
    if (moderationActions.length > 0) {
      const actionTypes = moderationActions.map((a: any) => a.action);
      const uniqueActions = [...new Set(actionTypes)];

      embed.addFields([
        {
          name: `🔨 Moderation History (${moderationActions.length})`,
          value: `**Actions:** ${uniqueActions.join(', ')}\n` +
                 `**Last action:** <t:${Math.floor(moderationActions[0].createdAt.getTime() / 1000)}:R>`,
          inline: false,
        },
      ]);
    } else {
      embed.addFields([
        {
          name: '🔨 Moderation History',
          value: '✅ No moderation actions',
          inline: false,
        },
      ]);
    }

    // Add server member info if available
    if (member) {
      const joinedTimestamp = member.joinedTimestamp;
      const joinedDaysAgo = joinedTimestamp
        ? Math.floor((Date.now() - joinedTimestamp) / (1000 * 60 * 60 * 24))
        : 0;

      const roles = member.roles.cache
        .filter((r: any) => r.id !== interaction.guildId) // Exclude @everyone
        .sort((a: any, b: any) => b.position - a.position)
        .map((r: any) => r.name)
        .slice(0, 5)
        .join(', ');

      embed.addFields([
        {
          name: '👥 Server Info',
          value: `**Joined:** ${joinedDaysAgo} days ago\n` +
                 `**Roles:** ${roles || 'None'}`,
          inline: false,
        },
      ]);
    }

    // Add recommendation
    let recommendation = '';
    if (reputationScore >= 90) {
      recommendation = '✅ Trusted member with excellent reputation';
    } else if (reputationScore >= 70) {
      recommendation = '🟡 Generally trustworthy, monitor activity';
    } else if (reputationScore >= 50) {
      recommendation = '🟠 Questionable reputation, increased monitoring recommended';
    } else {
      recommendation = '🔴 Poor reputation, consider moderation action';
    }

    if (isNewAccount) {
      recommendation += '\n⚠️ **Note:** Account is less than 7 days old';
    }

    embed.addFields([
      {
        name: '💡 Recommendation',
        value: recommendation,
        inline: false,
      },
    ]);

    await interaction.editReply({ embeds: [embed] });

    logger.info('Context menu: Check Reputation executed', {
      userId: interaction.user.id,
      targetUserId: targetUser.id,
      reputationScore,
      threats: threats.length,
      warnings: warnings.length,
      moderations: moderationActions.length,
    });
  } catch (error) {
    logger.error('Error in Check Reputation context menu:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await interaction.editReply({
      content: `❌ Error checking reputation: ${errorMessage}`,
    });
  }
}

export default { data, execute };
