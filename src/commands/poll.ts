import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { CommandType } from '../types';
import { logger } from '../utils/logger';
import { RateLimiters } from '../cache/rateLimiter';

// Emoji numbers for poll reactions
const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const command: CommandType = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Criar uma enquete')
    .addStringOption(option =>
      option
        .setName('pergunta')
        .setDescription('Pergunta da enquete')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName('opcao1')
        .setDescription('Opção 1')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao2')
        .setDescription('Opção 2')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao3')
        .setDescription('Opção 3')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao4')
        .setDescription('Opção 4')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao5')
        .setDescription('Opção 5')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao6')
        .setDescription('Opção 6')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao7')
        .setDescription('Opção 7')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao8')
        .setDescription('Opção 8')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao9')
        .setDescription('Opção 9')
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('opcao10')
        .setDescription('Opção 10')
        .setRequired(false)
        .setMaxLength(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    // 1. RATE LIMITING: Prevent abuse
    const rateLimit = await RateLimiters.COMMAND.checkLimit(interaction.user.id);
    if (!rateLimit.allowed) {
      return interaction.reply({
        content: `⏱️ Você está sendo limitado. Tente novamente em ${rateLimit.resetIn}s.`,
        ephemeral: true,
      });
    }

    const question = interaction.options.getString('pergunta', true);

    // 2. VALIDATION: Collect options
    const options: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const option = interaction.options.getString(`opcao${i}`);
      if (option) {
        options.push(option);
      }
    }

    // Must have at least 2 options (enforced by required fields, but double-check)
    if (options.length < 2) {
      return interaction.reply({
        content: '❌ Você precisa fornecer pelo menos 2 opções!',
        ephemeral: true,
      });
    }

    // 3. EXECUTION: Create poll embed
    try {
      // Build options text with emojis
      const optionsText = options
        .map((option, index) => `${POLL_EMOJIS[index]} ${option}`)
        .join('\n');

      // Create embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 ${question}`)
        .setDescription(optionsText)
        .setFooter({
          text: `Enquete criada por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // Send poll message
      const pollMessage = await interaction.reply({
        embeds: [embed],
        fetchReply: true,
      });

      // 4. ADD REACTIONS: Add reaction emojis for voting
      for (let i = 0; i < options.length; i++) {
        try {
          await pollMessage.react(POLL_EMOJIS[i]);
        } catch (error) {
          logger.error(`Erro ao adicionar reação ${POLL_EMOJIS[i]}:`, error);
        }
      }

      logger.info(
        `Enquete criada por ${interaction.user.tag}: "${question}" com ${options.length} opções`
      );
    } catch (error) {
      logger.error('Erro ao criar enquete:', error);
      await interaction.reply({
        content: '❌ Erro ao criar enquete!',
        ephemeral: true,
      });
    }

    return;
  },
};

export default command;
