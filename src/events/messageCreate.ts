import { Events, Message, PermissionFlagsBits } from 'discord.js';
import { getService } from '../container';
import {
  TYPES,
  IThreatDetectionService,
  IThreatIntelligenceService,
  IIncidentResponseService,
  ThreatData,
  ThreatAlertData,
} from '../types/container';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';

/**
 * Message Create Event
 *
 * Fires when a message is sent in a guild channel.
 * This event enables real-time threat detection and response.
 *
 * Detection Pipeline:
 * 1. Analyze message for threats (URLs, attachments, content)
 * 2. Query threat intelligence platforms (MISP, OpenCTI)
 * 3. Calculate aggregate threat score
 * 4. Take automated action if threshold exceeded
 * 5. Record threat detection in database
 * 6. Forward to Vértice-MAXIMUS ecosystem
 *
 * Note: Requires Message Content privileged intent
 */
export const name = Events.MessageCreate;

export async function execute(message: Message): Promise<void> {
  try {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) {
      return;
    }

    logger.debug(
      `Message created: ${message.author.tag} in ${message.guild.name} (${message.guild.id})`
    );

    // Get services from container
    const threatDetectionService = getService<IThreatDetectionService>(
      TYPES.ThreatDetectionService
    );
    const threatIntelligenceService = getService<IThreatIntelligenceService>(
      TYPES.ThreatIntelligenceService
    );
    const incidentResponseService = getService<IIncidentResponseService>(
      TYPES.IncidentResponseService
    );

    // 1. Analyze message for threats
    const analysis = await threatDetectionService.analyzeMessage(message);

    logger.debug(
      `Threat analysis complete: score=${analysis.threatScore}, threats=${analysis.threats.length}, shouldBlock=${analysis.shouldBlock}`
    );

    // If no threats detected, exit early
    if (analysis.threatScore === 0) {
      return;
    }

    // 2. Enrich with threat intelligence (for IOCs found)
    let mispEvent = null;
    let openCTIIndicator = null;

    if (analysis.iocs.urls.length > 0) {
      // Query MISP for URL IOCs
      for (const url of analysis.iocs.urls) {
        mispEvent = await threatIntelligenceService.queryMISP(url, 'url');
        if (mispEvent) {
          logger.info(
            `MISP match found for URL: ${url} (Event: ${mispEvent.id} - ${mispEvent.info})`
          );
          // Increase threat score if IOC found in MISP
          analysis.threatScore = Math.min(analysis.threatScore + 20, 100);
          break;
        }
      }

      // Query OpenCTI for enrichment
      if (analysis.iocs.urls.length > 0) {
        openCTIIndicator = await threatIntelligenceService.queryOpenCTI(
          analysis.iocs.urls[0]
        );
        if (openCTIIndicator) {
          logger.info(
            `OpenCTI match found: ${openCTIIndicator.name} (${openCTIIndicator.description})`
          );
        }
      }
    }

    // 3. Check threat score threshold
    const threshold = parseInt(
      process.env.THREAT_SCORE_THRESHOLD || '80',
      10
    );
    const shouldTakeAction = analysis.threatScore >= threshold;

    logger.info(
      `Threat detected: score=${analysis.threatScore}, threshold=${threshold}, action=${analysis.suggestedAction}`
    );

    // 4. Create interactive alert for high-score threats
    if (analysis.threatScore >= 50) {
      const alertData: ThreatAlertData = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: message.id,
        userId: message.author.id,
        username: message.author.tag,
        threatType: analysis.threats[0]?.type || 'unknown',
        threatScore: analysis.threatScore,
        description: analysis.threats[0]?.description || 'Threat detected',
        ioc: analysis.threats[0]?.ioc,
        iocType: analysis.threats[0]?.iocType,
        detectionSource: analysis.threats[0]?.source,
        mispEvent: mispEvent ? {
          id: mispEvent.id,
          info: mispEvent.info,
          threat_level_id: mispEvent.threat_level_id,
          tags: mispEvent.tags,
        } : undefined,
        openCTIIndicator: openCTIIndicator ? {
          id: openCTIIndicator.id,
          name: openCTIIndicator.name,
          description: openCTIIndicator.description,
          labels: openCTIIndicator.labels,
        } : undefined,
      };

      await incidentResponseService.createInteractiveAlert(
        message.client,
        message.guild.id,
        alertData
      );
    }

    // 5. Take automated action (if threshold exceeded)
    let actionTaken = 'none';

    if (shouldTakeAction) {
      actionTaken = await executeAutomatedResponse(message, analysis.suggestedAction);
    }

    // 6. Record threat detection in database
    await recordThreatDetection(message, analysis, actionTaken, {
      mispEvent,
      openCTIIndicator,
    });

    // 7. Report sighting to MISP (if IOC found in MISP)
    if (mispEvent && analysis.iocs.urls.length > 0) {
      await threatIntelligenceService.reportSighting(
        analysis.iocs.urls[0],
        message.guild.id
      );
    }

    // 8. Forward to Vértice-MAXIMUS ecosystem
    if (analysis.threatScore >= 50) {
      const threatData: ThreatData = {
        type: analysis.threats[0]?.type || 'unknown',
        description: analysis.threats[0]?.description || 'Threat detected',
        score: analysis.threatScore,
        ioc: analysis.threats[0]?.ioc || '',
        iocType: analysis.threats[0]?.iocType || 'unknown',
        guildId: message.guild.id,
        userId: message.author.id,
        messageId: message.id,
        detectionMethod: 'automated',
      };

      await threatIntelligenceService.forwardToVerticeMaximus(threatData);
    }

    logger.info(
      `Threat processing complete: ${message.id} (action: ${actionTaken})`
    );
  } catch (error: unknown) {
    logger.error(`Error in messageCreate event:`, error);
  }
}

/**
 * Execute automated response based on suggested action
 */
async function executeAutomatedResponse(
  message: Message,
  suggestedAction: string
): Promise<string> {
  try {
    const botMember = message.guild?.members.me;

    if (!botMember) {
      logger.warn('Bot member not found in guild');
      return 'none';
    }

    switch (suggestedAction) {
      case 'delete_message':
        if (
          message.deletable &&
          botMember.permissions.has(PermissionFlagsBits.ManageMessages)
        ) {
          await message.delete();
          logger.info(`Message deleted: ${message.id}`);
          return 'delete_message';
        }
        break;

      case 'timeout_user': {
        const member = message.member;
        if (
          member &&
          member.moderatable &&
          botMember.permissions.has(PermissionFlagsBits.ModerateMembers)
        ) {
          await member.timeout(
            60 * 60 * 1000, // 1 hour
            'Automated threat detection: High-risk content'
          );
          logger.info(`User timed out: ${message.author.tag}`);

          // Also delete message
          if (message.deletable) {
            await message.delete();
          }

          return 'timeout_user';
        }
        break;
      }

      case 'ban_user':
        if (
          message.member?.bannable &&
          botMember.permissions.has(PermissionFlagsBits.BanMembers)
        ) {
          await message.member.ban({
            reason: 'Automated threat detection: Critical threat',
            deleteMessageSeconds: 86400, // Delete messages from last 24h
          });
          logger.warn(`User banned: ${message.author.tag}`);
          return 'ban_user';
        }
        break;

      case 'alert_mods':
        // Send alert to mod log channel (would need to fetch from guild settings)
        logger.info(`Alert sent to moderators for message: ${message.id}`);
        return 'alert_mods';

      default:
        return 'none';
    }

    return 'none';
  } catch (error: unknown) {
    logger.error(`Error executing automated response:`, error);
    return 'error';
  }
}

/**
 * Record threat detection in database
 */
async function recordThreatDetection(
  message: Message,
  analysis: any,
  actionTaken: string,
  enrichment: {
    mispEvent: any;
    openCTIIndicator: any;
  }
): Promise<void> {
  try {
    if (!message.guild) {
      return;
    }

    // Get primary threat (highest score)
    const primaryThreat = analysis.threats.reduce(
      (max: any, threat: any) => (threat.score > max.score ? threat : max),
      { score: 0, type: 'unknown', ioc: '', iocType: 'unknown', source: 'unknown' }
    );

    await prisma.threatDetection.create({
      data: {
        guildId: message.guild.id,
        userId: message.author.id,
        username: message.author.tag,
        messageId: message.id,
        threatType: primaryThreat.type,
        threatScore: analysis.threatScore,
        ioc: primaryThreat.ioc,
        actionTaken,
        mispEventId: enrichment.mispEvent?.id || null,
        openCTIId: enrichment.openCTIIndicator?.id || null,
        metadata: {
          threats: analysis.threats,
          iocs: analysis.iocs,
          suggestedAction: analysis.suggestedAction,
          iocType: primaryThreat.iocType,
          detectionSource: primaryThreat.source,
          mispEvent: enrichment.mispEvent,
          openCTIIndicator: enrichment.openCTIIndicator,
        },
      },
    });

    logger.info(`Threat detection recorded: ${message.id}`);
  } catch (error: unknown) {
    logger.error(`Error recording threat detection:`, error);
  }
}

// Export as default for automatic loading
export default {
  name,
  execute,
};
