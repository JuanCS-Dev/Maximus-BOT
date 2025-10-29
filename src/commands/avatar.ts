import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibir avatar de um usuário')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuário para ver o avatar (padrão: você)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('tamanho')
        .setDescription('Tamanho do avatar')
        .setRequired(false)
        .addChoices(
          { name: '128px', value: 128 },
          { name: '256px', value: 256 },
          { name: '512px', value: 512 },
          { name: '1024px', value: 1024 },
          { name: '2048px (Original)', value: 2048 },
          { name: '4096px (Máximo)', value: 4096 }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // 1. RATE LIMITING: Prevent abuse
    const rateLimit = await RateLimiters.COMMAND.checkLimit(interaction.user.id);
    if (!rateLimit.allowed) {
      return interaction.reply({
        content: `⏱️ Você está sendo limitado. Tente novamente em ${rateLimit.resetIn}s.`,
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const size = interaction.options.getInteger('tamanho') || 1024;

    // 2. EXECUTION: Get avatar URLs
    try {
      await interaction.deferReply();

      // Fetch full user to get banner and avatar decoration
      const fetchedUser = await targetUser.fetch();

      // Get avatar URLs in different formats
      const avatarURL = fetchedUser.displayAvatarURL({ size: size as any });
      const avatarPNG = fetchedUser.displayAvatarURL({ extension: 'png', size: size as any });
      const avatarJPG = fetchedUser.displayAvatarURL({ extension: 'jpg', size: size as any });
      const avatarWEBP = fetchedUser.displayAvatarURL({ extension: 'webp', size: size as any });

      // Check if avatar is GIF
      const hasGIF = fetchedUser.avatar?.startsWith('a_');
      const avatarGIF = hasGIF
        ? fetchedUser.displayAvatarURL({ extension: 'gif', size: size as any })
        : null;

      // Get server-specific avatar if in guild
      let guildAvatar = null;
      if (interaction.guild) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member?.avatar) {
          guildAvatar = member.displayAvatarURL({ size: size as any });
        }
      }

      // 3. BUILD EMBED: Create avatar display embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🖼️ Avatar de ${targetUser.tag}`)
        .setDescription(
          guildAvatar
            ? `**Avatar do Servidor**\n(Este usuário tem um avatar personalizado neste servidor)`
            : `**Avatar Global**`
        )
        .setImage(guildAvatar || avatarURL)
        .setFooter({
          text: `Tamanho: ${size}px | Solicitado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // 4. BUILD BUTTONS: Create download buttons
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarPNG),
        new ButtonBuilder()
          .setLabel('JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarJPG),
        new ButtonBuilder()
          .setLabel('WEBP')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarWEBP)
      );

      // Add GIF button if avatar is animated
      if (hasGIF && avatarGIF) {
        buttons.addComponents(
          new ButtonBuilder()
            .setLabel('GIF')
            .setStyle(ButtonStyle.Link)
            .setURL(avatarGIF)
        );
      }

      // Add global avatar button if showing guild avatar
      if (guildAvatar) {
        buttons.addComponents(
          new ButtonBuilder()
            .setLabel('Avatar Global')
            .setStyle(ButtonStyle.Link)
            .setURL(avatarURL)
        );
      }

      // 5. RESPONSE: Send embed with buttons
      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });

      logger.info(`Avatar de ${targetUser.tag} visualizado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Erro ao buscar avatar:', error);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Erro ao buscar avatar do usuário!',
        });
      } else {
        await interaction.reply({
          content: '❌ Erro ao buscar avatar do usuário!',
          ephemeral: true,
        });
      }
    }

    return;
  },
};

export default command;
