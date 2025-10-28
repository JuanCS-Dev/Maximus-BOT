import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  Collection,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IAuditLogService, IGuildService } from '../types/container';
import { AuditAction } from '@prisma/client';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Deletar mensagens em massa')
    .addIntegerOption(option =>
      option
        .setName('quantidade')
        .setDescription('Número de mensagens a deletar (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Deletar apenas mensagens deste usuário (opcional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('razao')
        .setDescription('Motivo da limpeza')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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

    const amount = interaction.options.getInteger('quantidade', true);
    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razao') || 'Sem motivo especificado';

    // 3. VALIDATION: Channel type check
    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado em canais de texto!',
        ephemeral: true,
      });
    }

    // 4. VALIDATION: Bot permissions
    const botPermissions = channel.permissionsFor(interaction.guild.members.me!);
    if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ Não tenho permissão para gerenciar mensagens neste canal!',
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

    // 7. EXECUTION: Fetch and delete messages
    try {
      // Defer reply since this might take a while
      await interaction.deferReply({ ephemeral: true });

      // Fetch messages (fetch more to account for filtering)
      const fetchLimit = targetUser ? Math.min(amount * 3, 100) : amount;
      let messages = await channel.messages.fetch({ limit: fetchLimit });

      // Filter by user if specified
      if (targetUser) {
        messages = messages.filter(msg => msg.author.id === targetUser.id);
        // Limit to requested amount
        messages = new Collection(
          Array.from(messages.entries()).slice(0, amount)
        );
      }

      // Validate message age (Discord limitation: can't delete messages older than 14 days)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const validMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const tooOldCount = messages.size - validMessages.size;

      if (validMessages.size === 0) {
        return interaction.editReply({
          content: '❌ Não há mensagens válidas para deletar (mensagens devem ter menos de 14 dias).',
        });
      }

      // Bulk delete
      const deleted = await channel.bulkDelete(validMessages, true);

      // 8. AUDIT LOG: Record action (MANDATORY - Artigo V)
      await auditLogService.logAction(
        interaction.guild.id,
        targetUser?.id || interaction.user.id,
        AuditAction.PURGE,
        interaction.user.id,
        interaction.user.tag,
        reason,
        {
          channelId: channel.id,
          channelName: channel.name,
          messagesDeleted: deleted.size,
          requestedAmount: amount,
          tooOldCount,
          targetUserId: targetUser?.id,
          targetUserTag: targetUser?.tag,
        }
      );

      logger.info(
        `${deleted.size} mensagens deletadas por ${interaction.user.tag} ` +
        `no canal ${channel.name} | Motivo: ${reason}` +
        (targetUser ? ` | Filtrado por: ${targetUser.tag}` : '')
      );

      // 9. RESPONSE: User feedback
      let responseMessage = `✅ **${deleted.size}** mensagem(ns) deletada(s) com sucesso!`;

      if (targetUser) {
        responseMessage += `\n**Usuário filtrado:** ${targetUser.tag}`;
      }

      if (tooOldCount > 0) {
        responseMessage += `\n⚠️ **${tooOldCount}** mensagem(ns) muito antiga(s) não pôde(ram) ser deletada(s) (limite de 14 dias do Discord).`;
      }

      responseMessage += `\n**Motivo:** ${reason}`;

      await interaction.editReply({
        content: responseMessage,
      });

      // Delete the confirmation message after 5 seconds
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          logger.debug('Could not delete purge confirmation message');
        }
      }, 5000);

    } catch (error) {
      logger.error('Erro ao deletar mensagens:', error);

      // Check if we've already deferred
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Erro ao deletar mensagens. Verifique minhas permissões!',
        });
      } else {
        await interaction.reply({
          content: '❌ Erro ao deletar mensagens. Verifique minhas permissões!',
          ephemeral: true,
        });
      }
    }

    return;
  },
};

export default command;
