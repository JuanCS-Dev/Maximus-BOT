import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IUserService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silenciar um membro do servidor (timeout)')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a ser silenciado')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duracao')
        .setDescription('Duração do timeout em minutos')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320) // 28 dias em minutos (limite do Discord)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do silenciamento')
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
    const durationMinutes = interaction.options.getInteger('duracao', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // Convert minutes to milliseconds
    const durationMs = durationMinutes * 60 * 1000;

    // 3. VALIDATION: Duration limit (Discord max: 28 days)
    const maxDurationMs = 28 * 24 * 60 * 60 * 1000; // 28 days
    if (durationMs > maxDurationMs) {
      return interaction.reply({
        content: '❌ A duração máxima do timeout é de 28 dias (40320 minutos)!',
        ephemeral: true,
      });
    }

    // 4. VALIDATION: Fetch target member
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 5. VALIDATION: Cannot mute self
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Você não pode silenciar a si mesmo!',
        ephemeral: true,
      });
    }

    // 6. VALIDATION: Cannot mute bot
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({
        content: '❌ Não posso me silenciar!',
        ephemeral: true,
      });
    }

    // 7. VALIDATION: Role hierarchy - User vs Target
    const executor = interaction.member as GuildMember;
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode silenciar este usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 8. VALIDATION: Role hierarchy - Bot vs Target
    const botMember = await interaction.guild.members.fetchMe();
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso silenciar este usuário (cargo igual ou superior ao meu)!',
        ephemeral: true,
      });
    }

    // 9. VALIDATION: Check if user is already timed out
    if (targetMember.communicationDisabledUntil && targetMember.communicationDisabledUntil > new Date()) {
      return interaction.reply({
        content: `⚠️ **${targetUser.tag}** já está silenciado até <t:${Math.floor(targetMember.communicationDisabledUntil.getTime() / 1000)}:F>.\nUse este comando novamente para atualizar a duração.`,
        ephemeral: true,
      });
    }

    // 10. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const userService = getService<IUserService>(TYPES.UserService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 11. DATABASE: Ensure guild and users exist
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

    // 12. DM NOTIFICATION: Try to send DM before muting
    const expiresAt = new Date(Date.now() + durationMs);
    try {
      await targetUser.send(
        `🔇 Você foi **silenciado** no servidor **${interaction.guild.name}**\n` +
        `**Duração:** ${durationMinutes} minuto(s)\n` +
        `**Expira em:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n` +
        `**Motivo:** ${reason}\n` +
        `**Moderador:** ${interaction.user.tag}`
      );
    } catch (error) {
      logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
    }

    // 13. EXECUTION: Mute user (Discord timeout)
    try {
      await targetMember.timeout(durationMs, `${reason} | Silenciado por: ${interaction.user.tag}`);

      // 14. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.MUTE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          durationMinutes,
          expiresAt: expiresAt.toISOString(),
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `${targetUser.tag} foi silenciado por ${interaction.user.tag} | ` +
        `Duração: ${durationMinutes}min | Motivo: ${reason}`
      );

      // 15. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ **${targetUser.tag}** foi silenciado com sucesso!\n` +
          `**Duração:** ${durationMinutes} minuto(s)\n` +
          `**Expira em:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>\n` +
          `**Motivo:** ${reason}`,
      });
    } catch (error) {
      logger.error('Erro ao silenciar usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao silenciar o usuário. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
