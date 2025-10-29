import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { AIAssistantService } from '../services/AIAssistantService';
import { logger } from '../utils/logger';
import { CommandType } from '../types';

/**
 * /ask Command - AI-Powered Security Assistant
 *
 * Phase 6.1.1: AI Revolution
 *
 * Features:
 * - Ask security questions ("What is APT29?")
 * - Get threat intel explanations
 * - Learn about security concepts
 * - Conversation context (thread-based)
 *
 * Powered by: Claude 3.5 Sonnet
 */

const ask: CommandType = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI security assistant a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your security question')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(500)
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Show answer only to you (ephemeral)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const question = interaction.options.get('question', true).value as string;
      const isPrivate = (interaction.options.get('private')?.value as boolean) ?? true; // Default to ephemeral for security

      await interaction.deferReply({ ephemeral: isPrivate });

      const aiAssistant = getService<AIAssistantService>(TYPES.AIAssistantService);

      if (!aiAssistant.isAvailable()) {
        await interaction.editReply({
          content: '❌ AI Assistant is not available (API key not configured)',
        });
        return;
      }

      // Answer the question
      const response = await aiAssistant.answerSecurityQuestion(question);

      // Build embed with answer
      const embed = new EmbedBuilder()
        .setTitle('🤖 AI Security Assistant')
        .setDescription(response.answer)
        .setColor(response.confidence >= 80 ? 0x00ff00 : response.confidence >= 50 ? 0xffa500 : 0xff0000)
        .addFields([
          {
            name: '📊 Confidence',
            value: `${response.confidence}%`,
            inline: true,
          },
        ])
        .setFooter({
          text: 'Powered by Claude 3.5 Sonnet | Vértice Bot',
        })
        .setTimestamp();

      // Add sources if available
      if (response.sources && response.sources.length > 0) {
        embed.addFields([
          {
            name: '📚 Sources',
            value: response.sources.map((s, i) => `${i + 1}. ${s}`).join('\n'),
            inline: false,
          },
        ]);
      }

      // Add related topics if available
      if (response.relatedTopics && response.relatedTopics.length > 0) {
        embed.addFields([
          {
            name: '🔗 Related Topics',
            value: response.relatedTopics.join(', '),
            inline: false,
          },
        ]);
      }

      await interaction.editReply({ embeds: [embed] });

      logger.info(`/ask command executed`, {
        userId: interaction.user.id,
        question: question.substring(0, 50),
        confidence: response.confidence,
      });
    } catch (error) {
      logger.error('Error executing /ask command:', error);
      await interaction.editReply({
        content: '❌ Error processing your question. Please try again.',
      });
    }
  },
};

export default ask;
