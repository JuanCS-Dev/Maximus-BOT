import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IUserService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remover silenciamento de um membro')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para remover o silenciamento')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da remoção do silenciamento')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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

    // 3. VALIDATION: Fetch target member
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 4. VALIDATION: Check if user is actually muted
    if (!targetMember.communicationDisabledUntil || targetMember.communicationDisabledUntil <= new Date()) {
      return interaction.reply({
        content: `ℹ️ **${targetUser.tag}** não está silenciado.`,
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Role hierarchy - User vs Target
    const executor = interaction.member as GuildMember;
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode remover o silenciamento deste usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 6. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const userService = getService<IUserService>(TYPES.UserService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 7. DATABASE: Ensure guild and users exist
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

    // 8. DM NOTIFICATION: Try to send DM before unmuting
    try {
      await targetUser.send(
        `🔊 Seu silenciamento foi **removido** no servidor **${interaction.guild.name}**\n` +
        `**Motivo:** ${reason}\n` +
        `**Moderador:** ${interaction.user.tag}\n\n` +
        `Você já pode enviar mensagens novamente!`
      );
    } catch (error) {
      logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
    }

    // 9. EXECUTION: Unmute user (remove timeout)
    try {
      await targetMember.timeout(null, `${reason} | Silenciamento removido por: ${interaction.user.tag}`);

      // 10. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.UNMUTE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `Silenciamento de ${targetUser.tag} foi removido por ${interaction.user.tag} | Motivo: ${reason}`
      );

      // 11. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ Silenciamento de **${targetUser.tag}** foi removido com sucesso!\n` +
          `**Motivo:** ${reason}`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao remover silenciamento:', error);
      await interaction.reply({
        content: '❌ Erro ao remover silenciamento. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
