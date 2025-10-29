import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IUserService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Alterar apelido de um membro')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário alvo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('apelido')
        .setDescription('Novo apelido (deixe vazio para resetar)')
        .setRequired(false)
        .setMaxLength(32) // Discord nickname length limit
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da alteração')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

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
    const newNickname = interaction.options.getString('apelido');
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Fetch target member
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 4. VALIDATION: Cannot change bot's own nickname without permission
    if (targetUser.id === interaction.client.user.id) {
      const botPermissions = interaction.guild.members.me?.permissions;
      if (!botPermissions?.has(PermissionFlagsBits.ChangeNickname)) {
        return interaction.reply({
          content: '❌ Não tenho permissão para alterar meu próprio apelido!',
          ephemeral: true,
        });
      }
    }

    // 5. VALIDATION: Role hierarchy - User vs Target (except for self)
    const executor = interaction.member as GuildMember;
    if (targetUser.id !== interaction.user.id) {
      if (targetMember.roles.highest.position >= executor.roles.highest.position) {
        return interaction.reply({
          content: '❌ Você não pode alterar o apelido deste usuário (cargo igual ou superior ao seu)!',
          ephemeral: true,
        });
      }
    }

    // 6. VALIDATION: Role hierarchy - Bot vs Target
    const botMember = await interaction.guild.members.fetchMe();
    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso alterar o apelido deste usuário (cargo igual ou superior ao meu)!',
        ephemeral: true,
      });
    }

    // 7. VALIDATION: Check if nickname is actually changing
    const currentNickname = targetMember.nickname || null;
    if (currentNickname === newNickname) {
      return interaction.reply({
        content: `ℹ️ **${targetUser.tag}** já possui este apelido!`,
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

    // 10. EXECUTION: Change nickname
    try {
      await targetMember.setNickname(newNickname, `${reason} | Alterado por: ${interaction.user.tag}`);

      // 11. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        AuditAction.NICK_CHANGE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          previousNickname: currentNickname,
          newNickname: newNickname || null,
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `Apelido de ${targetUser.tag} alterado por ${interaction.user.tag} | ` +
        `De "${currentNickname || 'sem apelido'}" para "${newNickname || 'sem apelido'}" | Motivo: ${reason}`
      );

      // 12. DM NOTIFICATION: Notify user (except if changing own nickname)
      if (targetUser.id !== interaction.user.id) {
        try {
          await targetUser.send(
            `✏️ Seu apelido foi **alterado** no servidor **${interaction.guild.name}**\n` +
            `**Apelido anterior:** ${currentNickname || 'Nenhum'}\n` +
            `**Novo apelido:** ${newNickname || 'Nenhum (resetado)'}\n` +
            `**Motivo:** ${reason}\n` +
            `**Moderador:** ${interaction.user.tag}`
          );
        } catch (error) {
          logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
        }
      }

      // 13. RESPONSE: User feedback
      let responseMessage: string;

      if (newNickname) {
        responseMessage =
          `✅ Apelido de **${targetUser.tag}** alterado com sucesso!\n` +
          `**Apelido anterior:** ${currentNickname || 'Nenhum'}\n` +
          `**Novo apelido:** ${newNickname}\n` +
          `**Motivo:** ${reason}`;
      } else {
        responseMessage =
          `✅ Apelido de **${targetUser.tag}** resetado com sucesso!\n` +
          `**Apelido anterior:** ${currentNickname || 'Nenhum'}\n` +
          `**Motivo:** ${reason}`;
      }

      await interaction.reply({
        content: responseMessage,
      });
    } catch (error) {
      logger.error('Erro ao alterar apelido:', error);
      await interaction.reply({
        content: '❌ Erro ao alterar apelido. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
