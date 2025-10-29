import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { AIAssistantService } from '../services/AIAssistantService';
import { logger } from '../utils/logger';
import { CommandType } from '../types';

/**
 * /explain Command - AI Term Explainer
 *
 * Phase 6.1.1: AI Revolution
 *
 * Explains security terms, concepts, and acronyms
 * Educational tool for security team
 *
 * Examples:
 * - /explain term:APT
 * - /explain term:Zero-day
 * - /explain term:MITRE ATT&CK
 */

const explain: CommandType = {
  data: new SlashCommandBuilder()
    .setName('explain')
    .setDescription('Explain a security term or concept')
    .addStringOption(option =>
      option
        .setName('term')
        .setDescription('Security term to explain (e.g., APT, Zero-day, MITRE)')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const term = interaction.options.get('term', true).value as string;

      await interaction.deferReply({ ephemeral: true });

      const aiAssistant = getService<AIAssistantService>(TYPES.AIAssistantService);

      if (!aiAssistant.isAvailable()) {
        await interaction.editReply({
          content: '❌ AI Assistant is not available (API key not configured)',
        });
        return;
      }

      // Get explanation
      const explanation = await aiAssistant.explainTerm(term);

      // Split into chunks if too long (Discord embed limit: 4096 chars)
      const maxLength = 4000;
      const chunks = [];
      let currentChunk = '';

      for (const line of explanation.split('\n')) {
        if (currentChunk.length + line.length + 1 > maxLength) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      // Send first chunk as embed
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${term}`)
        .setDescription(chunks[0])
        .setColor(0x5865f2)
        .setFooter({
          text: 'Powered by Claude 3.5 Sonnet | Vértice Bot',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Send additional chunks as follow-up messages if needed
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          content: chunks[i],
        });
      }

      logger.info(`/explain command executed`, {
        userId: interaction.user.id,
        term,
      });
    } catch (error) {
      logger.error('Error executing /explain command:', error);
      await interaction.editReply({
        content: '❌ Error explaining term. Please try again.',
      });
    }
  },
};

export default explain;
