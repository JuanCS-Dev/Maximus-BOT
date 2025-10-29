import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IWarningService, IUserService, IGuildService } from '../types/container';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver avisos de um usuário')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para verificar avisos')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('mostrar_inativos')
        .setDescription('Mostrar também avisos limpos/inativos')
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
    const showInactive = interaction.options.getBoolean('mostrar_inativos') || false;

    // 3. SERVICE INTEGRATION: Get services
    const warningService = getService<IWarningService>(TYPES.WarningService);
    const guildService = getService<IGuildService>(TYPES.GuildService);
    const userService = getService<IUserService>(TYPES.UserService);

    // 4. DATABASE: Ensure guild and user exist
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
    } catch (error) {
      logger.error('Error syncing guild/user to database:', error);
    }

    // 5. EXECUTION: Fetch warnings
    try {
      const allWarnings = await warningService.getWarnings(targetUser.id, interaction.guild.id);
      const settings = await guildService.getGuildSettings(interaction.guild.id);

      // Filter active warnings
      const activeWarnings = allWarnings.filter(w => w.active);
      const inactiveWarnings = allWarnings.filter(w => !w.active);

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(activeWarnings.length >= settings.maxWarnings ? 0xff0000 : 0xffa500)
        .setTitle(`⚠️ Avisos de ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

      // Summary
      embed.addFields({
        name: '📊 Resumo',
        value:
          `**Avisos ativos:** ${activeWarnings.length}/${settings.maxWarnings}\n` +
          `**Avisos limpos:** ${inactiveWarnings.length}\n` +
          `**Total de avisos:** ${allWarnings.length}`,
        inline: false,
      });

      // Active warnings
      if (activeWarnings.length > 0) {
        const activeList = activeWarnings
          .slice(0, 10) // Limit to 10 most recent
          .map((w, index) => {
            const date = new Date(w.createdAt).toLocaleDateString('pt-BR');
            return `**${index + 1}.** ${w.reason}\n` +
                   `└ *Por ${w.moderatorTag} em ${date}*`;
          })
          .join('\n\n');

        embed.addFields({
          name: '🔴 Avisos Ativos',
          value: activeList || 'Nenhum aviso ativo',
          inline: false,
        });

        if (activeWarnings.length > 10) {
          embed.addFields({
            name: '⚠️',
            value: `*...e mais ${activeWarnings.length - 10} aviso(s)*`,
            inline: false,
          });
        }
      } else {
        embed.addFields({
          name: '✅ Avisos Ativos',
          value: 'Este usuário não possui avisos ativos.',
          inline: false,
        });
      }

      // Inactive warnings (if requested)
      if (showInactive && inactiveWarnings.length > 0) {
        const inactiveList = inactiveWarnings
          .slice(0, 5) // Limit to 5 most recent
          .map((w, index) => {
            const date = new Date(w.createdAt).toLocaleDateString('pt-BR');
            const clearedDate = w.clearedAt
              ? new Date(w.clearedAt).toLocaleDateString('pt-BR')
              : 'N/A';
            return `**${index + 1}.** ${w.reason}\n` +
                   `└ *Por ${w.moderatorTag} em ${date}*\n` +
                   `└ *Limpo em ${clearedDate} por ${w.clearedBy || 'Sistema'}*`;
          })
          .join('\n\n');

        embed.addFields({
          name: '⚪ Avisos Limpos',
          value: inactiveList,
          inline: false,
        });

        if (inactiveWarnings.length > 5) {
          embed.addFields({
            name: '⚠️',
            value: `*...e mais ${inactiveWarnings.length - 5} aviso(s) limpo(s)*`,
            inline: false,
          });
        }
      }

      // Warning about max threshold
      if (activeWarnings.length >= settings.maxWarnings) {
        embed.addFields({
          name: '⚠️ ATENÇÃO',
          value: `Este usuário atingiu o limite de avisos (${settings.maxWarnings}) e está sujeito a ban automático em novos avisos!`,
          inline: false,
        });
      }

      // 6. RESPONSE: Send embed
      await interaction.reply({ embeds: [embed], ephemeral: true });

      logger.info(`Avisos de ${targetUser.tag} consultados por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erro ao buscar avisos:', error);
      await interaction.reply({
        content: '❌ Erro ao buscar avisos. Tente novamente!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
