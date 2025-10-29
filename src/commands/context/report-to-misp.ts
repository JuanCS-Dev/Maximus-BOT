import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { getService } from '../../container';
import { TYPES } from '../../types/container';
import { IThreatIntelligenceService } from '../../types/container';
import { logger } from '../../utils/logger';

/**
 * Context Menu: Report to MISP
 *
 * Phase 6.1.2: Context Menus (Right-Click Actions)
 *
 * Usage: Right-click message → Apps → "Report to MISP"
 *
 * Features:
 * - Extract IOCs from message (URLs, IPs, domains, hashes)
 * - Create MISP event automatically
 * - Report sighting to existing event
 * - One-click threat intel sharing
 */

export const data = new ContextMenuCommandBuilder()
  .setName('Report to MISP')
  .setType(ApplicationCommandType.Message)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.targetMessage;

    // Check if MISP is enabled
    if (process.env.MISP_ENABLED !== 'true') {
      await interaction.editReply({
        content: '❌ MISP integration is not enabled. Set `MISP_ENABLED=true` in .env',
      });
      return;
    }

    // Check if message has content
    if (!message.content) {
      await interaction.editReply({
        content: '❌ Cannot report empty message (no content to extract IOCs from)',
      });
      return;
    }

    const threatIntelService = getService<IThreatIntelligenceService>(
      TYPES.ThreatIntelligenceService
    );

    // Extract IOCs from message
    const urlRegex = /https?:\/\/[^\s]+/g;
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const domainRegex = /\b([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
    const md5Regex = /\b[a-f0-9]{32}\b/gi;
    const sha256Regex = /\b[a-f0-9]{64}\b/gi;

    const urls = message.content.match(urlRegex) || [];
    const ips = message.content.match(ipRegex) || [];
    const domains = message.content.match(domainRegex) || [];
    const md5Hashes = message.content.match(md5Regex) || [];
    const sha256Hashes = message.content.match(sha256Regex) || [];

    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];
    const uniqueIps = [...new Set(ips)];
    const uniqueDomains = [...new Set(domains)];
    const uniqueMd5 = [...new Set(md5Hashes)];
    const uniqueSha256 = [...new Set(sha256Hashes)];

    const totalIOCs = uniqueUrls.length + uniqueIps.length + uniqueDomains.length +
                      uniqueMd5.length + uniqueSha256.length;

    if (totalIOCs === 0) {
      await interaction.editReply({
        content: '❌ No IOCs found in message (no URLs, IPs, domains, or hashes detected)',
      });
      return;
    }

    // Build embed showing what will be reported
    const embed = new EmbedBuilder()
      .setTitle('🚨 Report to MISP')
      .setDescription('The following IOCs will be reported to MISP:')
      .setColor(0xff6b00) // MISP orange
      .addFields([
        {
          name: '📊 Summary',
          value: `**Total IOCs:** ${totalIOCs}\n` +
                 `**URLs:** ${uniqueUrls.length}\n` +
                 `**IPs:** ${uniqueIps.length}\n` +
                 `**Domains:** ${uniqueDomains.length}\n` +
                 `**MD5:** ${uniqueMd5.length}\n` +
                 `**SHA-256:** ${uniqueSha256.length}`,
          inline: false,
        },
      ])
      .setFooter({
        text: 'MISP Event will be created | Vértice Bot',
      })
      .setTimestamp();

    // Add IOC details
    if (uniqueUrls.length > 0) {
      embed.addFields([
        {
          name: '🔗 URLs',
          value: uniqueUrls.slice(0, 5).map(u => `• \`${u}\``).join('\n') +
                 (uniqueUrls.length > 5 ? `\n... and ${uniqueUrls.length - 5} more` : ''),
          inline: false,
        },
      ]);
    }

    if (uniqueIps.length > 0) {
      embed.addFields([
        {
          name: '🌐 IP Addresses',
          value: uniqueIps.slice(0, 5).map(ip => `• \`${ip}\``).join('\n') +
                 (uniqueIps.length > 5 ? `\n... and ${uniqueIps.length - 5} more` : ''),
          inline: false,
        },
      ]);
    }

    if (uniqueDomains.length > 0) {
      embed.addFields([
        {
          name: '🏷️ Domains',
          value: uniqueDomains.slice(0, 5).map(d => `• \`${d}\``).join('\n') +
                 (uniqueDomains.length > 5 ? `\n... and ${uniqueDomains.length - 5} more` : ''),
          inline: false,
        },
      ]);
    }

    if (uniqueMd5.length > 0 || uniqueSha256.length > 0) {
      const hashesText = [
        ...uniqueMd5.slice(0, 2).map(h => `• MD5: \`${h}\``),
        ...uniqueSha256.slice(0, 2).map(h => `• SHA-256: \`${h}\``),
      ].join('\n');

      embed.addFields([
        {
          name: '#️⃣ File Hashes',
          value: hashesText +
                 ((uniqueMd5.length + uniqueSha256.length) > 4
                   ? `\n... and ${(uniqueMd5.length + uniqueSha256.length) - 4} more`
                   : ''),
          inline: false,
        },
      ]);
    }

    // Show preview
    await interaction.editReply({ embeds: [embed] });

    // Create threat data for MISP
    const threatData = {
      type: 'suspicious_activity',
      description: `Discord message with ${totalIOCs} IOCs detected`,
      score: 70, // Medium-high confidence
      ioc: uniqueUrls[0] || uniqueIps[0] || uniqueDomains[0] || '', // Primary IOC
      iocType: uniqueUrls.length > 0 ? 'url' : uniqueIps.length > 0 ? 'ip' : 'domain',
      guildId: interaction.guildId || '',
      userId: message.author.id,
      messageId: message.id,
      detectionMethod: 'manual_report',
    };

    try {
      const mispEvent = await threatIntelService.createMISPEvent(
        threatData,
        interaction.guildId || ''
      );

      if (mispEvent) {
        // Update embed with success
        embed.setColor(0x00ff00);
        embed.addFields([
          {
            name: '✅ MISP Event Created',
            value: `**Event ID:** ${mispEvent.id}\n` +
                   `**Info:** ${mispEvent.info}\n` +
                   `**Tags:** ${mispEvent.tags?.join(', ') || 'None'}`,
            inline: false,
          },
        ]);

        await interaction.editReply({ embeds: [embed] });

        logger.info('Context menu: Report to MISP executed', {
          userId: interaction.user.id,
          messageId: message.id,
          mispEventId: mispEvent.id,
          iocsCount: totalIOCs,
        });
      } else {
        throw new Error('Failed to create MISP event');
      }
    } catch (error) {
      logger.error('Error creating MISP event:', error);

      embed.setColor(0xff0000);
      embed.addFields([
        {
          name: '❌ Error',
          value: `Failed to create MISP event: ${error instanceof Error ? error.message : 'Unknown error'}`,
          inline: false,
        },
      ]);

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error in Report to MISP context menu:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await interaction.editReply({
      content: `❌ Error reporting to MISP: ${errorMessage}`,
    });
  }
}

export default { data, execute };
