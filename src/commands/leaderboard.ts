import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { GamificationService } from '../services/GamificationService';
import { logger } from '../utils/logger';

/**
 * /leaderboard - View server leaderboard
 *
 * Phase 6.2: Gamification System
 *
 * Shows top 10 users by:
 * - Level & XP
 * - Total messages
 * - Voice time
 */

const leaderboard = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard')
    .addStringOption(option =>
      option
        .setName('period')
        .setDescription('Leaderboard period')
        .setRequired(false)
        .addChoices(
          { name: 'All Time', value: 'alltime' },
          { name: 'Monthly', value: 'monthly' },
          { name: 'Weekly', value: 'weekly' },
          { name: 'Daily', value: 'daily' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of users to show (max 25)')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server',
        });
        return;
      }

      const period = (interaction.options.getString('period') || 'alltime') as any;
      const limit = interaction.options.getInteger('limit') || 10;

      const gamificationService = getService<GamificationService>(TYPES.GamificationService);

      // Get leaderboard
      const leaderboard = await gamificationService.getLeaderboard(
        interaction.guildId!,
        period,
        limit
      );

      if (leaderboard.length === 0) {
        await interaction.editReply({
          content: '📊 No leaderboard data yet. Start chatting to appear on the leaderboard!',
        });
        return;
      }

      // Fetch usernames from Discord
      const enrichedLeaderboard = await Promise.all(
        leaderboard.map(async (entry) => {
          try {
            const user = await interaction.client.users.fetch(entry.userId);
            return {
              ...entry,
              username: user.username,
            };
          } catch {
            return entry;
          }
        })
      );

      // Build leaderboard text
      const medals = ['🥇', '🥈', '🥉'];
      const leaderboardText = enrichedLeaderboard
        .map((entry, index) => {
          const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
          const voiceHours = Math.floor(entry.totalVoiceTime / 60);
          const voiceMinutes = entry.totalVoiceTime % 60;
          const voiceTimeText = voiceHours > 0 ? `${voiceHours}h ${voiceMinutes}m` : `${voiceMinutes}m`;

          return (
            `${medal} <@${entry.userId}>\n` +
            `   Level **${entry.level}** • **${entry.xp.toLocaleString()}** XP\n` +
            `   Messages: **${entry.totalMessages.toLocaleString()}** • Voice: **${voiceTimeText}**`
          );
        })
        .join('\n\n');

      // Build embed
      const periodTexts: Record<string, string> = {
        alltime: 'All Time',
        monthly: 'This Month',
        weekly: 'This Week',
        daily: 'Today',
      };
      const periodText = periodTexts[period] || 'All Time';

      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
        .setDescription(
          `**Period:** ${periodText}\n` +
          `**Top ${enrichedLeaderboard.length} Members**\n\n` +
          leaderboardText
        )
        .setColor(0xffd700)
        .setThumbnail(interaction.guild.iconURL() || '')
        .setFooter({
          text: 'Keep chatting to climb the ranks!',
        })
        .setTimestamp();

      // Add user's rank if not in top
      const userRank = enrichedLeaderboard.findIndex(e => e.userId === interaction.user.id);
      if (userRank === -1) {
        const userLevel = await gamificationService.getUserLevel(
          interaction.user.id,
          interaction.guildId!
        );

        if (userLevel && userLevel.level > 0) {
          embed.addFields([
            {
              name: '📍 Your Rank',
              value: `Level **${userLevel.level}** • **${userLevel.xp.toLocaleString()}** XP\n` +
                     `Messages: **${userLevel.totalMessages.toLocaleString()}**`,
              inline: false,
            },
          ]);
        }
      }

      await interaction.editReply({ embeds: [embed] });

      logger.info('Leaderboard command executed', {
        userId: interaction.user.id,
        period,
        limit,
        resultsCount: leaderboard.length,
      });
    } catch (error) {
      logger.error('Error in /leaderboard command:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply({
        content: `❌ Error fetching leaderboard: ${errorMessage}`,
      });
    }
  },
};

export default leaderboard;
