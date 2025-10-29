import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  NewsChannel,
  ForumChannel,
  PermissionOverwrites,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Bloquear canal (remove permissão de enviar mensagens)')
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do bloqueio')
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

    // 5. VALIDATION: Check if channel is already locked
    const everyoneRole = interaction.guild.roles.everyone;
    const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);

    if (currentPermissions?.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        content: `⚠️ Este canal já está bloqueado!`,
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

    // 8. EXECUTION: Lock channel
    try {
      // Store current permissions for potential unlock later
      const previousPermissions: PermissionOverwrites | undefined = currentPermissions;

      // Lock channel by denying SEND_MESSAGES for @everyone
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
      }, {
        reason: `Canal bloqueado por ${interaction.user.tag}: ${reason}`,
      });

      // 9. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        interaction.user.id, // Target is the channel, but we use moderator as fallback
        AuditAction.LOCKDOWN,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
          previousPermissions: previousPermissions ? {
            allow: previousPermissions.allow.toArray(),
            deny: previousPermissions.deny.toArray(),
          } : null,
        }
      );

      logger.info(
        `Canal ${channel.name} bloqueado por ${interaction.user.tag} | Motivo: ${reason}`
      );

      // 10. RESPONSE: User feedback
      await interaction.reply({
        content:
          `🔒 **Canal bloqueado com sucesso!**\n` +
          `**Canal:** ${channel.name}\n` +
          `**Motivo:** ${reason}\n\n` +
          `Apenas membros com permissões especiais podem enviar mensagens agora.\n` +
          `Use \`/unlock\` para desbloquear o canal.`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao bloquear canal:', error);
      await interaction.reply({
        content: '❌ Erro ao bloquear o canal. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
