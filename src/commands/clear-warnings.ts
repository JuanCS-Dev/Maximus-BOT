import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import {
  TYPES,
  IAuditLogService,
  IUserService,
  IGuildService,
  IWarningService,
} from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('clear-warnings')
    .setDescription('Limpar avisos de um usuário')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para limpar avisos')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da limpeza dos avisos')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    // 1. VALIDATION: Guild check
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em servidores!',
        ephemeral: true
      });
    }

    // 2. RATE LIMITING: Prevent abuse
    const rateLimit = await RateLimiters.COMMAND.checkLimit(interaction.user.id);
    if (!rateLimit.allowed) {
      return interaction.reply({
        content: `⏱️ Você está sendo limitado. Tente novamente em ${rateLimit.resetIn}s.`,
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Cannot clear own warnings
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Você não pode limpar seus próprios avisos!',
        ephemeral: true,
      });
    }

    // 4. SERVICE INTEGRATION: Get services
    const warningService = getService<IWarningService>(TYPES.WarningService);
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const guildService = getService<IGuildService>(TYPES.GuildService);
    const userService = getService<IUserService>(TYPES.UserService);

    // 5. DATABASE: Ensure guild and users exist
    try {
      await guildService.getOrCreateGuild(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.iconURL() || undefined
      );

      await userService.getOrCreateUser(
        targetUser.id,
        targetUser.username,
        targetUser.discriminator,
        targetUser.avatarURL() || undefined,
        targetUser.bot
      );

      await userService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username,
        interaction.user.discriminator,
        interaction.user.avatarURL() || undefined,
        interaction.user.bot
      );
    } catch (error) {
      logger.error('Error syncing guild/users to database:', error);
    }

    // 6. EXECUTION: Clear warnings
    try {
      // Check if user has any active warnings
      const activeCount = await warningService.getActiveWarningsCount(
        targetUser.id,
        interaction.guild.id
      );

      if (activeCount === 0) {
        return interaction.reply({
          content: `ℹ️ **${targetUser.tag}** não possui avisos ativos para limpar.`,
          ephemeral: true,
        });
      }

      // Clear all active warnings
      const clearedCount = await warningService.clearWarnings(
        targetUser.id,
        interaction.guild.id,
        interaction.user.id
      );

      // 7. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.CLEAR_WARNINGS,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          clearedCount,
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `${clearedCount} avisos de ${targetUser.tag} foram limpos por ${interaction.user.tag} | Motivo: ${reason}`
      );

      // 8. DM NOTIFICATION: Notify user
      try {
        await targetUser.send(
          `✅ Seus avisos foram **limpos** no servidor **${interaction.guild.name}**\n` +
          `**Avisos limpos:** ${clearedCount}\n` +
          `**Motivo:** ${reason}\n` +
          `**Moderador:** ${interaction.user.tag}\n\n` +
          `Você agora tem 0 avisos ativos. Continue seguindo as regras!`
        );
      } catch (error) {
        logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
      }

      // 9. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ Avisos de **${targetUser.tag}** foram limpos com sucesso!\n` +
          `**Avisos limpos:** ${clearedCount}\n` +
          `**Motivo:** ${reason}`,
      });
    } catch (error) {
      logger.error('Erro ao limpar avisos:', error);
      await interaction.reply({
        content: '❌ Erro ao limpar avisos. Tente novamente!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
