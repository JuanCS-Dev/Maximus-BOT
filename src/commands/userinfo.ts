import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PresenceStatus,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IUserService, IGuildService } from '../types/container';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Exibir informações de um usuário')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para ver informações (padrão: você)')
        .setRequired(false)
    ),

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

    const targetUser = interaction.options.getUser('usuario') || interaction.user;

    // 3. SERVICE INTEGRATION: Get services
    const userService = getService<IUserService>(TYPES.UserService);
    const guildService = getService<IGuildService>(TYPES.GuildService);

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

    // 5. EXECUTION: Gather user information
    try {
      await interaction.deferReply();

      // Fetch member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        return interaction.editReply({
          content: '❌ Usuário não encontrado no servidor!',
        });
      }

      // Status emoji mapping
      const statusEmojis: Record<PresenceStatus, string> = {
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        offline: '⚫',
        invisible: '⚫',
      };

      const status = member.presence?.status || 'offline';
      const statusEmoji = statusEmojis[status];
      const statusText = {
        online: 'Online',
        idle: 'Ausente',
        dnd: 'Não Perturbe',
        offline: 'Offline',
        invisible: 'Invisível',
      }[status];

      // Get roles (excluding @everyone)
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .slice(0, 15); // Limit to 15 roles

      const roleText = roles.length > 0
        ? roles.join(', ') + (member.roles.cache.size - 1 > 15 ? ` (+${member.roles.cache.size - 1 - 15} mais)` : '')
        : 'Nenhum cargo';

      // Get permissions
      const keyPermissions = [];
      if (member.permissions.has('Administrator')) keyPermissions.push('Administrador');
      if (member.permissions.has('ManageGuild')) keyPermissions.push('Gerenciar Servidor');
      if (member.permissions.has('ManageRoles')) keyPermissions.push('Gerenciar Cargos');
      if (member.permissions.has('ManageChannels')) keyPermissions.push('Gerenciar Canais');
      if (member.permissions.has('KickMembers')) keyPermissions.push('Expulsar Membros');
      if (member.permissions.has('BanMembers')) keyPermissions.push('Banir Membros');

      const permissionsText = keyPermissions.length > 0
        ? keyPermissions.join(', ')
        : 'Nenhuma permissão chave';

      // Check if user is boosting
      const boostingSince = member.premiumSinceTimestamp
        ? `Desde <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`
        : 'Não está boostando';

      // Get activities
      const activities = member.presence?.activities || [];
      const activityText = activities.length > 0
        ? activities.map(a => `${a.name}`).join(', ')
        : 'Nenhuma atividade';

      // 6. BUILD EMBED: Create rich information embed
      const embed = new EmbedBuilder()
        .setColor(member.displayHexColor || 0x5865F2)
        .setTitle(`👤 Informações do Usuário`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setDescription(
          `**${targetUser.tag}**\n` +
          `${targetUser.bot ? '🤖 Bot' : '👤 Usuário'}\n` +
          `ID: \`${targetUser.id}\``
        )
        .addFields(
          {
            name: '📊 Status',
            value: `${statusEmoji} ${statusText}`,
            inline: true,
          },
          {
            name: '📅 Conta Criada',
            value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: '📥 Entrou no Servidor',
            value: member.joinedTimestamp
              ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
              : 'Desconhecido',
            inline: true,
          },
          {
            name: '🎭 Cargos',
            value: roleText,
            inline: false,
          },
          {
            name: '🔑 Permissões Chave',
            value: permissionsText,
            inline: false,
          },
          {
            name: '⭐ Boost',
            value: boostingSince,
            inline: true,
          },
          {
            name: '🎮 Atividade',
            value: activityText,
            inline: true,
          }
        )
        .setFooter({
          text: `Solicitado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Add nickname if exists
      if (member.nickname) {
        embed.addFields({
          name: '✏️ Apelido',
          value: member.nickname,
          inline: true,
        });
      }

      // Add banner if exists
      const fetchedUser = await targetUser.fetch();
      if (fetchedUser.banner) {
        const bannerUrl = fetchedUser.bannerURL({ size: 1024 });
        if (bannerUrl) {
          embed.setImage(bannerUrl);
        }
      }

      // 7. RESPONSE: Send embed
      await interaction.editReply({ embeds: [embed] });

      logger.info(`Informações de ${targetUser.tag} consultadas por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erro ao buscar informações do usuário:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Erro ao buscar informações do usuário!',
        });
      } else {
        await interaction.reply({
          content: '❌ Erro ao buscar informações do usuário!',
          ephemeral: true,
        });
      }
    }

    return;
  },
};

export default command;
