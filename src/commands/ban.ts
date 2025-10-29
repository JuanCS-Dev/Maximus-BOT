import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IUserService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um membro do servidor')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a ser banido')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('deletar_mensagens')
        .setDescription('Deletar mensagens dos últimos X dias (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
    const deleteMessageDays = interaction.options.getInteger('deletar_mensagens') || 0;

    // 3. VALIDATION: Fetch target member
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 4. VALIDATION: Role hierarchy - User vs Target
    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode banir este usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Role hierarchy - Bot vs Target
    const botMember = await interaction.guild.members.fetchMe();
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso banir este usuário (cargo igual ou superior ao meu)!',
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

    // 8. DM NOTIFICATION: Try to send DM before banning
    try {
      await targetUser.send(
        `🔨 Você foi **banido** do servidor **${interaction.guild.name}**\n` +
        `**Motivo:** ${reason}\n` +
        `**Moderador:** ${interaction.user.tag}`
      );
    } catch (error) {
      logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
    }

    // 9. EXECUTION: Ban user
    try {
      await member.ban({
        reason: `${reason} | Banido por: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60,
      });

      // 10. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.BAN,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          deleteMessageDays,
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(`${targetUser.tag} foi banido por ${interaction.user.tag} | Motivo: ${reason}`);

      // 11. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ **${targetUser.tag}** foi banido com sucesso!\n` +
          `**Motivo:** ${reason}\n` +
          `**Mensagens deletadas:** ${deleteMessageDays} dias`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao banir usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao banir o usuário. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
