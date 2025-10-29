import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { RateLimiters } from '../cache/rateLimiter';

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Enviar um anúncio formatado')
    .addStringOption(option =>
      option
        .setName('titulo')
        .setDescription('Título do anúncio')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName('mensagem')
        .setDescription('Mensagem do anúncio')
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal onde enviar (padrão: canal atual)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option
        .setName('mencao')
        .setDescription('Tipo de menção')
        .setRequired(false)
        .addChoices(
          { name: 'Nenhuma', value: 'none' },
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' }
        )
    )
    .addStringOption(option =>
      option
        .setName('cor')
        .setDescription('Cor do embed')
        .setRequired(false)
        .addChoices(
          { name: 'Azul (Padrão)', value: 'blue' },
          { name: 'Verde', value: 'green' },
          { name: 'Vermelho', value: 'red' },
          { name: 'Amarelo', value: 'yellow' },
          { name: 'Roxo', value: 'purple' },
          { name: 'Laranja', value: 'orange' }
        )
    )
    .addStringOption(option =>
      option
        .setName('imagem')
        .setDescription('URL da imagem para exibir no anúncio')
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

    const title = interaction.options.getString('titulo', true);
    const message = interaction.options.getString('mensagem', true);
    const targetChannel = interaction.options.getChannel('canal') as TextChannel || interaction.channel as TextChannel;
    const mentionType = interaction.options.getString('mencao') || 'none';
    const colorChoice = interaction.options.getString('cor') || 'blue';
    const imageUrl = interaction.options.getString('imagem');

    // 3. VALIDATION: Channel type check
    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.reply({
        content: '❌ O canal especificado não é um canal de texto!',
        ephemeral: true,
      });
    }

    // 4. VALIDATION: Image URL format
    if (imageUrl && !imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
      return interaction.reply({
        content: '❌ A URL da imagem deve ser válida e terminar com .jpg, .jpeg, .png, .gif ou .webp!',
        ephemeral: true,
      });
    }

    // 5. VALIDATION: Bot permissions in target channel
    const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me!);
    if (!botPermissions?.has('SendMessages')) {
      return interaction.reply({
        content: '❌ Não tenho permissão para enviar mensagens no canal especificado!',
        ephemeral: true,
      });
    }

    if (!botPermissions?.has('EmbedLinks')) {
      return interaction.reply({
        content: '❌ Não tenho permissão para enviar embeds no canal especificado!',
        ephemeral: true,
      });
    }

    // 6. VALIDATION: Mention permissions
    if (mentionType === 'everyone' && !botPermissions?.has('MentionEveryone')) {
      return interaction.reply({
        content: '❌ Não tenho permissão para mencionar @everyone no canal especificado!',
        ephemeral: true,
      });
    }

    // 7. EXECUTION: Build announcement embed
    try {
      // Color mapping
      const colorMap: Record<string, number> = {
        blue: 0x5865F2,
        green: 0x57F287,
        red: 0xED4245,
        yellow: 0xFEE75C,
        purple: 0x5865F2,
        orange: 0xF26522,
      };

      const embedColor = colorMap[colorChoice] || colorMap.blue;

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`📢 ${title}`)
        .setDescription(message)
        .setFooter({
          text: `Anúncio por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Add image if provided
      if (imageUrl) {
        embed.setImage(imageUrl);
      }

      // Build mention content
      let mentionContent = '';
      if (mentionType === 'everyone') {
        mentionContent = '@everyone';
      } else if (mentionType === 'here') {
        mentionContent = '@here';
      }

      // 8. EXECUTION: Send announcement
      await targetChannel.send({
        content: mentionContent || undefined,
        embeds: [embed],
      });

      // 9. RESPONSE: Confirmation
      const confirmationMessage =
        `✅ Anúncio enviado com sucesso!` +
        (targetChannel.id !== interaction.channelId ? `\n📍 Canal: ${targetChannel}` : '') +
        (mentionType !== 'none' ? `\n🔔 Menção: ${mentionType === 'everyone' ? '@everyone' : '@here'}` : '');

      await interaction.reply({
        content: confirmationMessage,
        ephemeral: true,
      });

      logger.info(
        `Anúncio "${title}" enviado por ${interaction.user.tag} no canal ${targetChannel.name} ` +
        `(Guild: ${interaction.guild.name})`
      );
    } catch (error) {
      logger.error('Erro ao enviar anúncio:', error);
      await interaction.reply({
        content: '❌ Erro ao enviar anúncio. Verifique minhas permissões!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
