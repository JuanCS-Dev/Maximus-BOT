import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  NewsChannel,
  ForumChannel,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquear canal (permite enviar mensagens)')
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do desbloqueio')
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

    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Channel type check
    const channel = interaction.channel;
    if (
      !channel ||
      !(channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ForumChannel)
    ) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em canais de texto, notícias ou fóruns!',
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

    if (!botPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '❌ Não tenho permissão para gerenciar roles!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Check if channel is actually locked
    const everyoneRole = interaction.guild.roles.everyone;
    const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (!currentPermissions?.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content: `ℹ️ Este canal não está bloqueado.`,
        ephemeral: true,
      });
    }

    // 6. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 7. DATABASE: Ensure guild exists
    try {
      await guildService.getOrCreateGuild(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.iconURL() || undefined
      );
    } catch (error) {
      logger.error('Error syncing guild to database:', error);
    }

    // 8. EXECUTION: Unlock channel
    try {
      // Unlock channel by removing the SEND_MESSAGES deny override
      // This returns the permission to whatever it was before (default: allowed for @everyone)
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null, // null = remove override, use default/inherited
      }, {
        reason: `Canal desbloqueado por ${interaction.user.tag}: ${reason}`,
      });

      // 9. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        interaction.user.id, // Target is the channel, but we use moderator as fallback
        AuditAction.UNLOCK,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
        }
      );

      logger.info(
        `Canal ${channel.name} desbloqueado por ${interaction.user.tag} | Motivo: ${reason}`
      );

      // 10. RESPONSE: User feedback
      await interaction.reply({
        content:
          `🔓 **Canal desbloqueado com sucesso!**\n` +
          `**Canal:** ${channel.name}\n` +
          `**Motivo:** ${reason}\n\n` +
          `Todos os membros podem enviar mensagens novamente.`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao desbloquear canal:', error);
      await interaction.reply({
        content: '❌ Erro ao desbloquear o canal. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
