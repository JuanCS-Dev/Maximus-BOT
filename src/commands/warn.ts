import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
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
    .setName('warn')
    .setDescription('Avisar um membro do servidor')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário a ser avisado')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo do aviso')
        .setRequired(true)
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
    const reason = interaction.options.getString('razao', true);

    // 3. VALIDATION: Cannot warn self
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Você não pode avisar a si mesmo!',
        ephemeral: true,
      });
    }

    // 4. VALIDATION: Cannot warn bot
    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ Não é possível avisar bots!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Fetch target member
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 6. VALIDATION: Role hierarchy - User vs Target
    const executor = interaction.member as GuildMember;
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode avisar este usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 7. SERVICE INTEGRATION: Get services
    const warningService = getService<IWarningService>(TYPES.WarningService);
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const guildService = getService<IGuildService>(TYPES.GuildService);
    const userService = getService<IUserService>(TYPES.UserService);

    // 8. DATABASE: Ensure guild and users exist
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

    // 9. EXECUTION: Add warning
    try {
      // Add warning to database
      const warning = await warningService.addWarning(
        targetUser.id,
        interaction.guild.id,
        interaction.user.id,
        interaction.user.tag,
        reason
      );

      // Get guild settings for max warnings threshold
      const settings = await guildService.getGuildSettings(interaction.guild.id);
      const activeWarnings = await warningService.getActiveWarningsCount(
        targetUser.id,
        interaction.guild.id
      );

      // 10. AUDIT LOG: Record warning (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.WARN,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          warningId: warning.id,
          activeWarnings,
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `${targetUser.tag} foi avisado por ${interaction.user.tag} | ` +
        `Motivo: ${reason} | Avisos ativos: ${activeWarnings}`
      );

      // 11. DM NOTIFICATION: Send warning to user
      try {
        await targetUser.send(
          `⚠️ Você recebeu um **aviso** no servidor **${interaction.guild.name}**\n` +
          `**Motivo:** ${reason}\n` +
          `**Moderador:** ${interaction.user.tag}\n` +
          `**Avisos ativos:** ${activeWarnings}/${settings.maxWarnings}\n\n` +
          (activeWarnings >= settings.maxWarnings
            ? '⚠️ Você atingiu o limite de avisos e pode ser banido!'
            : `Você tem ${settings.maxWarnings - activeWarnings} aviso(s) restante(s) antes de ação automática.`)
        );
      } catch (error) {
        logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
      }

      // 12. AUTO-ACTION: Check if max warnings reached
      let autoActionMessage = '';
      if (activeWarnings >= settings.maxWarnings) {
        try {
          // Auto-ban user
          await targetMember.ban({
            reason: `Limite de avisos atingido (${activeWarnings}/${settings.maxWarnings}) | Último aviso: ${reason}`,
          });

          // Log auto-ban
          await auditLogService.logAction(
            interaction.guild.id,
            targetUser.id,
            AuditAction.BAN,
            interaction.client.user.id,
            'SISTEMA (Auto-ban)',
            `Limite de avisos atingido (${activeWarnings}/${settings.maxWarnings})`,
            {
              autoAction: true,
              triggeredBy: interaction.user.id,
              triggeredByTag: interaction.user.tag,
            }
          );

          autoActionMessage = `\n\n🔨 **Ação automática:** Usuário foi banido por atingir ${settings.maxWarnings} avisos.`;
          logger.info(`${targetUser.tag} foi AUTO-BANIDO por atingir ${activeWarnings} avisos`);
        } catch (error) {
          logger.error('Erro ao aplicar auto-ban:', error);
          autoActionMessage = `\n\n⚠️ **Aviso:** Usuário atingiu o limite de avisos mas não pôde ser banido automaticamente.`;
        }
      }

      // 13. RESPONSE: User feedback
      await interaction.reply({
        content:
          `✅ **${targetUser.tag}** foi avisado com sucesso!\n` +
          `**Motivo:** ${reason}\n` +
          `**Avisos ativos:** ${activeWarnings}/${settings.maxWarnings}` +
          autoActionMessage,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Erro ao avisar usuário:', error);
      await interaction.reply({
        content: '❌ Erro ao registrar aviso. Tente novamente!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
