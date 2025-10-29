import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('incident')
  .setDescription('Start an incident response playbook')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Incident type')
      .setRequired(true)
      .addChoices(
        { name: 'Raid - Mass coordinated attack', value: 'raid' },
        { name: 'Phishing - Malicious URLs/scams', value: 'phishing' },
        { name: 'Malware - Malicious file distribution', value: 'malware' },
        { name: 'Doxxing - Personal information leak', value: 'doxxing' },
        { name: 'Toxicity - Severe harassment/abuse', value: 'toxicity' },
        { name: 'Other - General security incident', value: 'other' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('severity')
      .setDescription('Incident severity')
      .setRequired(true)
      .addChoices(
        { name: 'Low - Minor impact', value: 'low' },
        { name: 'Medium - Moderate impact', value: 'medium' },
        { name: 'High - Significant impact', value: 'high' },
        { name: 'Critical - Severe/ongoing threat', value: 'critical' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('description')
      .setDescription('Brief description of the incident')
      .setRequired(true)
      .setMaxLength(500)
  )
  .addUserOption((option) =>
    option
      .setName('suspect')
      .setDescription('Primary suspect (if known)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });

    const incidentType = interaction.options.getString('type', true);
    const severity = interaction.options.getString('severity', true);
    const description = interaction.options.getString('description', true);
    const suspect = interaction.options.getUser('suspect');

    logger.info(
      `Incident playbook started: ${incidentType} (${severity}) by ${interaction.user.tag}`
    );

    // 1. Create incident case in database
    const incidentCase = await prisma.incidentCase.create({
      data: {
        guildId: interaction.guildId!,
        incidentType,
        severity,
        status: 'open',
        channelId: '', // Will update after channel creation
        relatedThreats: [],
        timeline: {
          events: [
            {
              timestamp: new Date().toISOString(),
              action: 'incident_created',
              actor: interaction.user.tag,
              description: description,
            },
          ],
          description: description,
          reporter: interaction.user.tag,
          reporterId: interaction.user.id,
          suspect: suspect?.tag,
          suspectId: suspect?.id,
        },
      },
    });

    logger.info(`Incident case created: ${incidentCase.id}`);

    // 2. Create private IR channel
    const irChannel = await createIncidentChannel(
      interaction,
      incidentCase.id,
      incidentType,
      severity
    );

    if (!irChannel) {
      await interaction.editReply({
        content: '❌ Failed to create incident response channel',
      });
      return;
    }

    // 3. Update incident case with channel ID
    await prisma.incidentCase.update({
      where: { id: incidentCase.id },
      data: { channelId: irChannel.id },
    });

    // 4. Send initial message to IR channel
    await sendIncidentBriefing(irChannel, {
      caseId: incidentCase.id,
      type: incidentType,
      severity,
      description,
      reporter: interaction.user.tag,
      suspect: suspect?.tag,
    });

    // 5. Notify initiator
    await interaction.editReply({
      content: `✅ Incident response playbook initiated!\n\n**Case ID:** \`${incidentCase.id}\`\n**IR Channel:** ${irChannel}\n**Status:** Open\n\nThe IR team has been notified.`,
    });

    logger.info(
      `Incident playbook complete: ${incidentCase.id} (channel: ${irChannel.id})`
    );
  } catch (error: unknown) {
    logger.error(`Error in /incident command:`, error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    await interaction.editReply({
      content: `❌ Failed to start incident playbook: ${errorMessage}`,
    });
  }
}

/**
 * Create private incident response channel
 */
async function createIncidentChannel(
  interaction: ChatInputCommandInteraction,
  caseId: string,
  incidentType: string,
  severity: string
): Promise<TextChannel | null> {
  try {
    const guild = interaction.guild;
    if (!guild) {
      return null;
    }

    // Get or create IR category
    let irCategory = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        c.name.toLowerCase().includes('incident')
    );

    if (!irCategory) {
      irCategory = await guild.channels.create({
        name: '🚨 Incident Response',
        type: ChannelType.GuildCategory,
        position: 0,
      });
    }

    // Create private channel for this incident
    const channelName = `ir-${caseId.substring(0, 8)}-${incidentType}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: irCategory.id,
      topic: `🚨 Incident Response | Case: ${caseId} | Severity: ${severity.toUpperCase()}`,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id, // Initiator
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me!.id, // Bot
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    // Add moderators/admins to channel
    const moderators = guild.members.cache.filter(
      (m) =>
        m.permissions.has(PermissionFlagsBits.ModerateMembers) && !m.user.bot
    );

    for (const [, moderator] of moderators) {
      try {
        await channel.permissionOverwrites.create(moderator, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
      } catch (error: unknown) {
        logger.warn(
          `Failed to add moderator ${moderator.user.tag} to IR channel:`,
          error
        );
      }
    }

    logger.info(
      `IR channel created: ${channel.name} (${moderators.size} moderators added)`
    );

    return channel as TextChannel;
  } catch (error: unknown) {
    logger.error(`Error creating incident channel:`, error);
    return null;
  }
}

/**
 * Send initial incident briefing to IR channel
 */
async function sendIncidentBriefing(
  channel: TextChannel,
  incident: {
    caseId: string;
    type: string;
    severity: string;
    description: string;
    reporter: string;
    suspect?: string;
  }
): Promise<void> {
  try {
    const severityColor = getSeverityColor(incident.severity);
    const severityEmoji = getSeverityEmoji(incident.severity);

    const embed = new EmbedBuilder()
      .setTitle(
        `${severityEmoji} Incident Response Playbook - ${incident.type.toUpperCase()}`
      )
      .setColor(severityColor)
      .setDescription(incident.description)
      .addFields(
        {
          name: '📋 Case Information',
          value: [
            `**Case ID:** \`${incident.caseId}\``,
            `**Type:** ${incident.type}`,
            `**Severity:** ${incident.severity.toUpperCase()}`,
            `**Reported By:** ${incident.reporter}`,
            `**Status:** 🔴 OPEN`,
          ].join('\n'),
        },
        {
          name: '🎯 Initial Actions',
          value: [
            '1️⃣ Review incident details and evidence',
            '2️⃣ Identify affected users/channels',
            '3️⃣ Implement containment measures',
            '4️⃣ Document all actions taken',
            '5️⃣ Escalate if needed',
          ].join('\n'),
        }
      )
      .setTimestamp()
      .setFooter({ text: 'MAXIMUS Incident Response System' });

    if (incident.suspect) {
      embed.addFields({
        name: '👤 Primary Suspect',
        value: incident.suspect,
      });
    }

    await channel.send({
      content: `@here **Incident Response Team** - New ${incident.severity.toUpperCase()} severity incident`,
      embeds: [embed],
    });

    // Send playbook checklist
    const checklistEmbed = new EmbedBuilder()
      .setTitle('📝 Incident Response Checklist')
      .setColor(0x5865f2)
      .setDescription(getPlaybookChecklist(incident.type))
      .setFooter({
        text: 'Update this channel with your progress and findings',
      });

    await channel.send({ embeds: [checklistEmbed] });

    logger.info(`Incident briefing sent to channel: ${channel.id}`);
  } catch (error: unknown) {
    logger.error(`Error sending incident briefing:`, error);
  }
}

/**
 * Get incident-specific playbook checklist
 */
function getPlaybookChecklist(incidentType: string): string {
  const checklists: Record<string, string> = {
    raid: [
      '☐ Enable verification level (VERY_HIGH)',
      '☐ Kick recent suspicious members',
      '☐ Lock down affected channels',
      '☐ Review audit logs for patterns',
      '☐ Ban confirmed raiders',
      '☐ Document raid tactics/timing',
      '☐ Report to Discord Trust & Safety',
    ].join('\n'),

    phishing: [
      '☐ Delete all phishing messages',
      '☐ Ban/timeout phishing accounts',
      '☐ Warn members about the scam',
      '☐ Report URLs to Google Safe Browsing',
      '☐ Check for compromised accounts',
      '☐ Update server rules/warnings',
      '☐ Create MISP event for IOCs',
    ].join('\n'),

    malware: [
      '☐ Delete malicious attachments',
      '☐ Ban malware distributors',
      '☐ Warn members not to download',
      '☐ Submit samples to VirusTotal',
      '☐ Create MISP event with hashes',
      '☐ Scan for additional compromised accounts',
      '☐ Update security policies',
    ].join('\n'),

    doxxing: [
      '☐ Delete all doxxing content immediately',
      '☐ Ban perpetrators permanently',
      '☐ Contact affected victims',
      '☐ Report to Discord Trust & Safety',
      '☐ Document evidence (screenshots)',
      '☐ Consider legal action',
      '☐ Review channel permissions',
    ].join('\n'),

    toxicity: [
      '☐ Timeout/ban offending users',
      '☐ Delete toxic messages',
      '☐ Check user history for patterns',
      '☐ Warn community about behavior',
      '☐ Review moderation policies',
      '☐ Escalate if harassment continues',
      '☐ Provide support to victims',
    ].join('\n'),

    other: [
      '☐ Assess incident scope and impact',
      '☐ Identify affected resources',
      '☐ Implement containment measures',
      '☐ Document evidence and timeline',
      '☐ Execute response actions',
      '☐ Monitor for escalation',
      '☐ Create post-incident report',
    ].join('\n'),
  };

  return (
    checklists[incidentType] ||
    checklists.other
  );
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string): number {
  switch (severity) {
    case 'critical':
      return 0x8b0000; // Dark red
    case 'high':
      return 0xff0000; // Red
    case 'medium':
      return 0xff8c00; // Orange
    case 'low':
      return 0xffff00; // Yellow
    default:
      return 0x5865f2; // Discord blue
  }
}

/**
 * Get severity emoji
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '🔵';
  }
}
