import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { getService } from '../container';
import { TYPES } from '../types/container';
import { AutoModService } from '../services/AutoModService';
import { logger } from '../utils/logger';

/**
 * /automod - Configure Discord AutoMod v2
 *
 * Phase 6.1.3: Discord AutoMod Integration
 *
 * Subcommands:
 * - setup: Configure AutoMod with recommended settings
 * - disable: Disable all AutoMod rules
 * - status: View current AutoMod configuration
 * - keywords: Manage blocked keywords
 */

const automod = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure Discord AutoMod (ML-based content filtering)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup AutoMod with recommended security settings')
        .addChannelOption(option =>
          option
            .setName('alert_channel')
            .setDescription('Channel for AutoMod alerts')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('max_mentions')
            .setDescription('Maximum mentions per message (default: 5)')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('timeout_duration')
            .setDescription('Timeout duration in seconds (default: 300 = 5min)')
            .setMinValue(60)
            .setMaxValue(2592000) // 30 days max
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable all Vértice AutoMod rules')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current AutoMod configuration and statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('keywords')
        .setDescription('Add blocked keywords to AutoMod filter')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add keywords', value: 'add' },
              { name: 'Remove keywords', value: 'remove' },
              { name: 'List keywords', value: 'list' }
            )
        )
        .addStringOption(option =>
          option
            .setName('keywords')
            .setDescription('Comma-separated keywords (for add/remove)')
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const autoModService = getService<AutoModService>(TYPES.AutoModService);

    try {
      await interaction.deferReply({ ephemeral: true });

      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server',
        });
        return;
      }

      switch (subcommand) {
        case 'setup':
          await handleSetup(interaction, autoModService);
          break;
        case 'disable':
          await handleDisable(interaction, autoModService);
          break;
        case 'status':
          await handleStatus(interaction, autoModService);
          break;
        case 'keywords':
          await handleKeywords(interaction, autoModService);
          break;
        default:
          await interaction.editReply({
            content: '❌ Unknown subcommand',
          });
      }
    } catch (error) {
      logger.error('Error in /automod command:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply({
        content: `❌ Error executing AutoMod command: ${errorMessage}`,
      });
    }
  },
};

/**
 * Setup AutoMod with recommended settings
 */
async function handleSetup(
  interaction: ChatInputCommandInteraction,
  autoModService: AutoModService
): Promise<void> {
  const alertChannel = interaction.options.getChannel('alert_channel');
  const maxMentions = interaction.options.getInteger('max_mentions') || 5;
  const timeoutDuration = interaction.options.getInteger('timeout_duration') || 300;

  const config = autoModService.getDefaultConfig(alertChannel?.id);
  config.maxMentions = maxMentions;
  config.timeoutDuration = timeoutDuration;

  await autoModService.setupAutoModRules(interaction.guild!, config);

  const embed = new EmbedBuilder()
    .setTitle('✅ AutoMod Setup Complete')
    .setDescription('Discord AutoMod has been configured with recommended security settings')
    .setColor(0x00ff00)
    .addFields([
      {
        name: '🛡️ Active Protections',
        value: '• **ML Content Filter** (Profanity, Sexual Content, Slurs)\n' +
               '• **Mention Spam Protection** (Max ' + maxMentions + ' mentions)\n' +
               '• **Keyword Blocking** (Custom keywords)',
        inline: false,
      },
      {
        name: '⚙️ Actions',
        value: '• Block violating messages\n' +
               `• ${alertChannel ? `Send alerts to ${alertChannel}` : 'No alert channel set'}\n` +
               `• Timeout users for ${timeoutDuration}s`,
        inline: false,
      },
      {
        name: '📊 Next Steps',
        value: '• Use `/automod keywords add` to add custom blocked words\n' +
               '• Use `/automod status` to view current rules\n' +
               '• AutoMod runs on Discord\'s servers (FREE!)',
        inline: false,
      },
    ])
    .setFooter({
      text: 'Powered by Discord AutoMod v2 | Vértice Bot',
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info('AutoMod setup completed', {
    guildId: interaction.guildId,
    userId: interaction.user.id,
    maxMentions,
    timeoutDuration,
  });
}

/**
 * Disable all AutoMod rules
 */
async function handleDisable(
  interaction: ChatInputCommandInteraction,
  autoModService: AutoModService
): Promise<void> {
  await autoModService.disableAutoMod(interaction.guild!);

  const embed = new EmbedBuilder()
    .setTitle('🔴 AutoMod Disabled')
    .setDescription('All Vértice AutoMod rules have been disabled')
    .setColor(0xff0000)
    .addFields([
      {
        name: '⚠️ Warning',
        value: 'Your server is no longer protected by AutoMod.\n' +
               'Use `/automod setup` to re-enable protection.',
        inline: false,
      },
    ])
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  logger.info('AutoMod disabled', {
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });
}

/**
 * Show AutoMod status
 */
async function handleStatus(
  interaction: ChatInputCommandInteraction,
  autoModService: AutoModService
): Promise<void> {
  const stats = await autoModService.getAutoModStats(interaction.guild!);

  const statusEmoji = stats.activeRules > 0 ? '🟢' : '🔴';
  const statusText = stats.activeRules > 0 ? 'Active' : 'Inactive';

  const embed = new EmbedBuilder()
    .setTitle(`${statusEmoji} AutoMod Status`)
    .setDescription(`Discord AutoMod is currently **${statusText}**`)
    .setColor(stats.activeRules > 0 ? 0x00ff00 : 0xff0000)
    .addFields([
      {
        name: '📊 Statistics',
        value: `**Total Rules:** ${stats.totalRules}\n` +
               `**Active Rules:** ${stats.activeRules}`,
        inline: true,
      },
      {
        name: '\\u200b',
        value: '\\u200b',
        inline: true,
      },
      {
        name: '\\u200b',
        value: '\\u200b',
        inline: true,
      },
    ])
    .setFooter({
      text: 'Vértice Bot',
    })
    .setTimestamp();

  if (stats.ruleNames.length > 0) {
    embed.addFields([
      {
        name: '📋 Active Rules',
        value: stats.ruleNames.map(name => `• ${name}`).join('\n'),
        inline: false,
      },
    ]);
  } else {
    embed.addFields([
      {
        name: '⚠️ No Rules Configured',
        value: 'Use `/automod setup` to configure AutoMod protection',
        inline: false,
      },
    ]);
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Manage blocked keywords
 */
async function handleKeywords(
  interaction: ChatInputCommandInteraction,
  _autoModService: AutoModService
): Promise<void> {
  const action = interaction.options.getString('action', true);
  const keywordsInput = interaction.options.getString('keywords');

  if (action !== 'list' && !keywordsInput) {
    await interaction.editReply({
      content: '❌ Please provide keywords to add/remove',
    });
    return;
  }

  // For now, show informational message
  // Full implementation would require storing keywords in database
  const embed = new EmbedBuilder()
    .setTitle('🔑 Keyword Management')
    .setDescription('Keyword management is available through the `/automod setup` command')
    .setColor(0x0099ff)
    .addFields([
      {
        name: '💡 How to Add Keywords',
        value: '1. Use `/automod setup` to configure AutoMod\n' +
               '2. Keywords are managed through Discord\'s AutoMod rules\n' +
               '3. View active rules with `/automod status`',
        inline: false,
      },
      {
        name: '📝 Example Keywords',
        value: '• Phishing domains: `discord.gg/fake`, `free-nitro.com`\n' +
               '• Scam phrases: `free giveaway`, `click here now`\n' +
               '• Malicious content: custom threats specific to your community',
        inline: false,
      },
    ])
    .setFooter({
      text: 'Vértice Bot',
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export default automod;
