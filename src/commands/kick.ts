import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IUserService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar um membro do servidor')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a ser expulso')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da expulsão')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

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

    // 4. VALIDATION: Check if target is bot itself
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({
        content: '❌ Não posso me expulsar!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Role hierarchy - User vs Target
    const executor = interaction.member as GuildMember;
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode expulsar este usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 6. VALIDATION: Role hierarchy - Bot vs Target
    const botMember = await interaction.guild.members.fetchMe();
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso expulsar este usuário (cargo igual ou superior ao meu)!',
        ephemeral: true,
      });
    }

    // 7. VALIDATION: Kickable check
    if (!targetMember.kickable) {
      return interaction.reply({
        content: '❌ Não posso expulsar este usuário. Verifique as permissões!',
        ephemeral: true,
      });
    }

    // 8. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const userService = getService<IUserService>(TYPES.UserService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 9. DATABASE: Ensure guild and users exist
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

    // 10. DM NOTIFICATION: Try to send DM before kicking
    try {
      await targetUser.send(
        `👢 Você foi **expulso** do servidor **${interaction.guild.name}**\n` +
        `**Motivo:** ${reason}\n` +
        `**Moderador:** ${interaction.user.tag}`
      );
    } catch (error) {
      logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
    }

    // 11. EXECUTION: Kick user
    try {
      await targetMember.kick(`${reason} | Expulso por: ${interaction.user.tag}`);

      // 12. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.KICK,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(`${targetUser.tag} foi expulso por ${interaction.user.tag} | Motivo: ${reason}`);

      // 13. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ **${targetUser.tag}** foi expulso com sucesso!\n` +
          `**Motivo:** ${reason}`,
      });
    } catch (error) {
      logger.error('Erro ao expulsar usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao expulsar o usuário. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
