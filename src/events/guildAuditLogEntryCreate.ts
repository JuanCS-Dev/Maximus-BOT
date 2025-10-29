import { Events, GuildAuditLogsEntry } from 'discord.js';
import { getService } from '../container';
import { TYPES, IForensicExportService } from '../types/container';
import { logger } from '../utils/logger';

/**
 * Guild Audit Log Entry Create Event
 *
 * Fires when a new audit log entry is created in Discord.
 * This event enables real-time forensic archiving and SIEM export.
 *
 * Purpose:
 * - Overcome Discord's 45-day audit log retention limit
 * - Ensure compliance with SOX, HIPAA, FINRA (7+ years retention)
 * - Export to SIEM for centralized security monitoring
 * - Maintain cryptographic chain of custody
 *
 * Note: Requires GuildModeration intent
 */
export const name = Events.GuildAuditLogEntryCreate;

export async function execute(
  auditLogEntry: GuildAuditLogsEntry,
  guild: any
): Promise<void> {
  try {
    const guildId = guild.id;

    logger.debug(
      `Audit log entry created: ${auditLogEntry.actionType} in guild ${guild.name} (${guildId})`
    );

    // Get ForensicExportService from container
    const forensicService = getService<IForensicExportService>(TYPES.ForensicExportService);

    // 1. Archive to PostgreSQL with chain of custody hash
    try {
      const archived = await forensicService.cacheAuditLog(auditLogEntry, guildId);
      logger.debug(
        `Audit log archived: ${archived.id} (hash: ${archived.chainOfCustodyHash.substring(0, 16)}...)`
      );
    } catch (error) {
      logger.error(`Failed to archive audit log:`, error);
    }

    // 2. Export to SIEM (if configured)
    try {
      const exported = await forensicService.exportToSIEM(auditLogEntry, guildId);
      if (exported) {
        logger.debug(`Audit log exported to SIEM: ${auditLogEntry.id}`);
      }
    } catch (error) {
      logger.error(`Failed to export to SIEM:`, error);
    }

    // 3. Detect high-severity actions for additional alerting
    const highSeverityActions = [
      'MemberBanAdd',
      'MemberKick',
      'RoleDelete',
      'ChannelDelete',
      'GuildUpdate',
      'MemberRoleUpdate',
    ];

    if (highSeverityActions.includes(auditLogEntry.actionType)) {
      logger.warn(
        `⚠️ High-severity action detected: ${auditLogEntry.actionType} by ${auditLogEntry.executor?.tag}`
      );

      // Future: Send alert to #soc-alerts channel
      // Future: Create ThreatDetection entry if suspicious
    }
  } catch (error) {
    logger.error(`Error in guildAuditLogEntryCreate event:`, error);
  }
}

// Export as default for automatic loading
export default {
  name,
  execute,
};
