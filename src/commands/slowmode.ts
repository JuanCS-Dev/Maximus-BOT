import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Configurar modo lento em um canal')
    .addIntegerOption(option =>
      option
        .setName('segundos')
        .setDescription('Intervalo em segundos entre mensagens (0 para desativar, máx: 21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600) // 6 hours (Discord limit)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da configuração')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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

    const seconds = interaction.options.getInteger('segundos', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Channel type check
    const channel = interaction.channel;
    if (
      !channel ||
      !(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel)
    ) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em canais de texto, notícias ou threads!',
        ephemeral: true,
      });
    }

    // 4. VALIDATION: Bot permissions
    const botPermissions = channel.permissionsFor(interaction.guild.members.me!);
    if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: '❌ Não tenho permissão para gerenciar canais!',
        ephemeral: true,
      });
    }

    // 5. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 6. DATABASE: Ensure guild exists
    try {
      await guildService.getOrCreateGuild(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.iconURL() || undefined
      );
    } catch (error) {
      logger.error('Error syncing guild to database:', error);
    }

    // 7. EXECUTION: Set slowmode
    try {
      const previousSlowmode = channel.rateLimitPerUser || 0;
      await channel.setRateLimitPerUser(seconds, reason);

      // 8. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        interaction.user.id, // Target is the channel, but we use moderator as fallback
        AuditAction.TIMEOUT, // Using TIMEOUT as closest match for slowmode
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          channelId: channel.id,
          channelName: channel.name,
          previousSlowmode,
          newSlowmode: seconds,
        }
      );

      logger.info(
        `Slowmode configurado no canal ${channel.name} por ${interaction.user.tag} | ` +
        `De ${previousSlowmode}s para ${seconds}s | Motivo: ${reason}`
      );

      // 9. RESPONSE: User feedback
      let responseMessage: string;

      if (seconds === 0) {
        responseMessage =
          `✅ **Modo lento desativado** neste canal!\n` +
          `**Canal:** ${channel.name}\n` +
          `**Motivo:** ${reason}`;
      } else {
        // Format time in human-readable format
        let timeString: string;
        if (seconds < 60) {
          timeString = `${seconds} segundo(s)`;
        } else if (seconds < 3600) {
          const minutes = Math.floor(seconds / 60);
          timeString = `${minutes} minuto(s)`;
        } else {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          timeString = minutes > 0 ? `${hours}h ${minutes}min` : `${hours} hora(s)`;
        }

        responseMessage =
          `✅ **Modo lento configurado** neste canal!\n` +
          `**Canal:** ${channel.name}\n` +
          `**Intervalo:** ${timeString} (${seconds}s)\n` +
          `**Motivo:** ${reason}\n\n` +
          `Os usuários devem aguardar ${timeString} entre mensagens.`;
      }

      await interaction.reply({
        content: responseMessage,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao configurar slowmode:', error);
      await interaction.reply({
        content: '❌ Erro ao configurar modo lento. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
