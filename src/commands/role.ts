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
    .setName('role')
    .setDescription('Adicionar ou remover cargo de um membro')
    .addStringOption(option =>
      option
        .setName('acao')
        .setDescription('Ação a ser executada')
        .setRequired(true)
        .addChoices(
          { name: 'Adicionar', value: 'add' },
          { name: 'Remover', value: 'remove' }
        )
    )
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário alvo')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('cargo')
        .setDescription('Cargo a adicionar/remover')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da alteração')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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

    const action = interaction.options.getString('acao', true) as 'add' | 'remove';
    const targetUser = interaction.options.getUser('usuario', true);
    const role = interaction.options.getRole('cargo', true);
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Fetch target member
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({
        content: '❌ Usuário não encontrado no servidor!',
        ephemeral: true
      });
    }

    // 4. VALIDATION: Cannot target self (except for specific cases)
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Você não pode modificar seus próprios cargos!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Cannot target bot
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({
        content: '❌ Não posso modificar meus próprios cargos!',
        ephemeral: true,
      });
    }

    // 6. VALIDATION: Role must be a role (not @everyone)
    if (role.id === interaction.guild.id) {
      return interaction.reply({
        content: '❌ Não é possível gerenciar o cargo @everyone!',
        ephemeral: true,
      });
    }

    // 7. VALIDATION: Check if role is managed (bot roles, boosts)
    if (role.managed) {
      return interaction.reply({
        content: '❌ Este cargo é gerenciado por uma integração (bot ou boost) e não pode ser modificado!',
        ephemeral: true,
      });
    }

    // 8. VALIDATION: Role hierarchy - User vs Target role
    const executor = interaction.member as GuildMember;
    if (role.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode gerenciar este cargo (cargo igual ou superior ao seu maior cargo)!',
        ephemeral: true,
      });
    }

    // 9. VALIDATION: Role hierarchy - Bot vs Target role
    const botMember = await interaction.guild.members.fetchMe();
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ Não posso gerenciar este cargo (cargo igual ou superior ao meu maior cargo)!',
        ephemeral: true,
      });
    }

    // 10. VALIDATION: Role hierarchy - User vs Target member
    if (targetMember.roles.highest.position >= executor.roles.highest.position) {
      return interaction.reply({
        content: '❌ Você não pode modificar cargos deste usuário (cargo igual ou superior ao seu)!',
        ephemeral: true,
      });
    }

    // 11. VALIDATION: Check current state
    const hasRole = targetMember.roles.cache.has(role.id);

    if (action === 'add' && hasRole) {
      return interaction.reply({
        content: `ℹ️ **${targetUser.tag}** já possui o cargo **${role.name}**!`,
        ephemeral: true,
      });
    }

    if (action === 'remove' && !hasRole) {
      return interaction.reply({
        content: `ℹ️ **${targetUser.tag}** não possui o cargo **${role.name}**!`,
        ephemeral: true,
      });
    }

    // 12. SERVICE INTEGRATION: Get services
    const auditLogService = getService<IAuditLogService>(TYPES.AuditLogService);
    const userService = getService<IUserService>(TYPES.UserService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 13. DATABASE: Ensure guild and users exist
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

    // 14. EXECUTION: Add or remove role
    try {
      if (action === 'add') {
        await targetMember.roles.add(role.id, `${reason} | Adicionado por: ${interaction.user.tag}`);
      } else {
        await targetMember.roles.remove(role.id, `${reason} | Removido por: ${interaction.user.tag}`);
      }

      // 15. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser.id,
        action === 'add' ? AuditAction.ROLE_ADD : AuditAction.ROLE_REMOVE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          roleId: role.id,
          roleName: role.name,
          targetTag: targetUser.tag,
          channelId: interaction.channelId,
        }
      );

      logger.info(
        `Cargo ${role.name} ${action === 'add' ? 'adicionado a' : 'removido de'} ${targetUser.tag} ` +
        `por ${interaction.user.tag} | Motivo: ${reason}`
      );

      // 16. DM NOTIFICATION: Notify user
      try {
        const actionText = action === 'add' ? 'adicionado' : 'removido';
        const emoji = action === 'add' ? '➕' : '➖';

        await targetUser.send(
          `${emoji} Um cargo foi **${actionText}** para você no servidor **${interaction.guild.name}**\n` +
          `**Cargo:** ${role.name}\n` +
          `**Motivo:** ${reason}\n` +
          `**Moderador:** ${interaction.user.tag}`
        );
      } catch (error) {
        logger.debug(`Não foi possível enviar DM para ${targetUser.tag}`);
      }

      // 17. RESPONSE: User feedback
      const actionText = action === 'add' ? 'adicionado a' : 'removido de';
      const emoji = action === 'add' ? '✅' : '✅';

      await interaction.reply({
        content:
          `${emoji} Cargo **${role.name}** ${actionText} **${targetUser.tag}** com sucesso!\n` +
          `**Motivo:** ${reason}`,
      });
    } catch (error) {
      logger.error('Erro ao modificar cargo:', error);
      await interaction.reply({
        content: '❌ Erro ao modificar cargo. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
