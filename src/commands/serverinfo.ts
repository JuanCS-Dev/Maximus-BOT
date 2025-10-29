import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { getService } from '../container';
import { TYPES, IGuildService } from '../types/container';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Exibir informações do servidor'),

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

    // 3. SERVICE INTEGRATION: Get services
    const guildService = getService<IGuildService>(TYPES.GuildService);

    // 4. DATABASE: Ensure guild exists
    try {
      await guildService.getOrCreateGuild(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.iconURL() || undefined
      );
    } catch (error) {
      logger.error('Error syncing guild to database:', error);
    }

    // 5. EXECUTION: Gather server information
    try {
      await interaction.deferReply(); // Defer since we're fetching data

      // Fetch additional data
      const guild = interaction.guild;
      await guild.members.fetch(); // Fetch all members for accurate counts

      // Count channels by type
      const channels = guild.channels.cache;
      const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
      const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
      const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
      const threads = channels.filter(c => c.isThread()).size;

      // Count members by status
      const members = guild.members.cache;
      const humans = members.filter(m => !m.user.bot).size;
      const bots = members.filter(m => m.user.bot).size;
      const onlineMembers = members.filter(m => m.presence?.status === 'online').size;

      // Count roles (excluding @everyone)
      const roles = guild.roles.cache.size - 1;

      // Count emojis
      const emojis = guild.emojis.cache.size;
      const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
      const staticEmojis = emojis - animatedEmojis;

      // Get boost information
      const boostTier = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount || 0;

      // Verification level
      const verificationLevels: Record<number, string> = {
        0: 'Nenhuma',
        1: 'Baixa',
        2: 'Média',
        3: 'Alta',
        4: 'Muito Alta',
      };
      const verificationLevel = verificationLevels[guild.verificationLevel] || 'Desconhecida';

      // Owner information
      const owner = await guild.fetchOwner();

      // 6. BUILD EMBED: Create rich information embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord Blurple
        .setTitle(`📊 Informações do Servidor`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .setDescription(`**${guild.name}**\nID: \`${guild.id}\``)
        .addFields(
          {
            name: '👑 Dono',
            value: `${owner.user.tag}\n\`${owner.id}\``,
            inline: true,
          },
          {
            name: '📅 Criado em',
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: '🔒 Verificação',
            value: verificationLevel,
            inline: true,
          },
          {
            name: '👥 Membros',
            value: `**Total:** ${guild.memberCount}\n**Humanos:** ${humans}\n**Bots:** ${bots}\n**Online:** ${onlineMembers}`,
            inline: true,
          },
          {
            name: '📝 Canais',
            value: `**Total:** ${channels.size}\n**Texto:** ${textChannels}\n**Voz:** ${voiceChannels}\n**Categorias:** ${categories}\n**Threads:** ${threads}`,
            inline: true,
          },
          {
            name: '🎭 Cargos',
            value: `${roles} cargos`,
            inline: true,
          },
          {
            name: '😀 Emojis',
            value: `**Total:** ${emojis}\n**Estáticos:** ${staticEmojis}\n**Animados:** ${animatedEmojis}`,
            inline: true,
          },
          {
            name: '⭐ Boost',
            value: `**Nível:** ${boostTier}\n**Boosts:** ${boostCount}`,
            inline: true,
          },
          {
            name: '🌍 Recursos',
            value: guild.features.length > 0
              ? guild.features.slice(0, 5).map(f => `\`${f}\``).join(', ') + (guild.features.length > 5 ? '...' : '')
              : 'Nenhum recurso especial',
            inline: false,
          }
        )
        .setFooter({
          text: `Solicitado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Add banner if exists
      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 1024 }));
      }

      // 7. RESPONSE: Send embed
      await interaction.editReply({ embeds: [embed] });

      logger.info(`Informações do servidor ${guild.name} consultadas por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erro ao buscar informações do servidor:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Erro ao buscar informações do servidor!',
        });
      } else {
        await interaction.reply({
          content: '❌ Erro ao buscar informações do servidor!',
          ephemeral: true,
        });
      }
    }

    return;
  },
};

export default command;
