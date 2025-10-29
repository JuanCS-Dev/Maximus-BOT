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
 * /rank - Check your or another user's level and XP
 *
 * Phase 6.2: Gamification System
 *
 * Shows:
 * - Current level
 * - Current XP and XP needed for next level
 * - Progress bar
 * - Total messages and voice time
 * - Message streak
 * - Badges (top 3)
 */

const rank = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your level, XP, and progress')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check (leave empty for yourself)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: false }); // Public for flex!

      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server',
        });
        return;
      }

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const gamificationService = getService<GamificationService>(TYPES.GamificationService);

      // Get user level data
      const levelData = await gamificationService.getUserLevel(
        targetUser.id,
        interaction.guildId!
      );

      if (!levelData) {
        await interaction.editReply({
          content: `❌ ${targetUser.id === interaction.user.id ? 'You have' : 'This user has'} no level data yet. Start chatting to earn XP!`,
        });
        return;
      }

      // Get badges
      const badges = await gamificationService.getUserBadges(
        targetUser.id,
        interaction.guildId!
      );

      // Calculate progress bar
      const progressPercent = (levelData.xp / levelData.xpNeeded) * 100;
      const progressBarLength = 20;
      const filledBlocks = Math.floor((progressPercent / 100) * progressBarLength);
      const emptyBlocks = progressBarLength - filledBlocks;
      const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

      // Formatvoice time
      const hours = Math.floor(levelData.totalVoiceTime / 60);
      const minutes = levelData.totalVoiceTime % 60;
      const voiceTimeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Build embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : targetUser.username + "'s"} Rank Card`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0x5865f2)
        .addFields([
          {
            name: '📊 Level',
            value: `**${levelData.level}**`,
            inline: true,
          },
          {
            name: '⭐ Total XP',
            value: `**${levelData.xp.toLocaleString()}**`,
            inline: true,
          },
          {
            name: '🎯 Next Level',
            value: `**${levelData.xpRemaining?.toLocaleString() || 0}** XP`,
            inline: true,
          },
          {
            name: '📈 Progress',
            value: `\`${progressBar}\` ${Math.round(progressPercent)}%\n` +
                   `**${levelData.xp}** / **${levelData.xpNeeded}** XP`,
            inline: false,
          },
          {
            name: '📝 Messages',
            value: `**${levelData.totalMessages.toLocaleString()}**`,
            inline: true,
          },
          {
            name: '🎤 Voice Time',
            value: `**${voiceTimeText}**`,
            inline: true,
          },
          {
            name: '🔥 Streak',
            value: `**${levelData.messageStreak}** days`,
            inline: true,
          },
        ])
        .setFooter({
          text: 'Keep chatting to level up!',
        })
        .setTimestamp();

      // Add top badges
      if (badges.length > 0) {
        const topBadges = badges.slice(0, 5)
          .map(ub => `${ub.badge.emoji} **${ub.badge.name}** (${ub.badge.rarity})`)
          .join('\n');

        embed.addFields([
          {
            name: `🏆 Badges (${badges.length})`,
            value: topBadges,
            inline: false,
          },
        ]);
      }

      await interaction.editReply({ embeds: [embed] });

      logger.info('Rank command executed', {
        userId: interaction.user.id,
        targetUserId: targetUser.id,
        level: levelData.level,
      });
    } catch (error) {
      logger.error('Error in /rank command:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply({
        content: `❌ Error fetching rank data: ${errorMessage}`,
      });
    }
  },
};

export default rank;
