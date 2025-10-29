import { injectable } from 'inversify';
import { ArchivedAuditLog, Prisma } from '@prisma/client';
import { GuildAuditLogsEntry } from 'discord.js';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { generateChainOfCustodyHash, createForensicMetadata } from '../utils/chainOfCustody';
import type { IForensicExportService } from '../types/container';

/**
 * Forensic Export Service
 *
 * Implements permanent audit log storage and SIEM integration to overcome
 * Discord's 45-day audit log retention limit.
 *
 * Features:
 * - Permanent PostgreSQL archive with chain of custody hashing
 * - SIEM export (Splunk/Elasticsearch) for compliance
 * - Batch export for historical data
 * - Cryptographic integrity verification (SHA-256)
 *
 * Compliance: NIST SP 800-86, SOX, HIPAA, FINRA (7+ years retention)
 */
@injectable()
export class ForensicExportService implements IForensicExportService {
  /**
   * Archive Discord audit log entry to permanent storage
   *
   * @param entry - Discord audit log entry
   * @returns Archived audit log with chain of custody hash
   */
  async cacheAuditLog(entry: GuildAuditLogsEntry, guildId: string): Promise<ArchivedAuditLog> {
    try {
      // Extract audit log data
      const auditData = {
        discordAuditLogId: entry.id,
        actionType: entry.actionType,
        actorId: entry.executorId || undefined,
        actorTag: entry.executor?.tag || undefined,
        targetId: entry.targetId || undefined,
        targetTag: entry.target && 'tag' in entry.target ? (entry.target as any).tag : undefined,
        reason: entry.reason || undefined,
        changes: entry.changes ? JSON.parse(JSON.stringify(entry.changes)) : undefined,
        createdAt: entry.createdAt,
      };

      // Generate chain of custody hash
      const hash = generateChainOfCustodyHash(auditData);

      // Store in database
      const archived = await prisma.archivedAuditLog.create({
        data: {
          guildId,
          discordAuditLogId: entry.id,
          actionType: entry.actionType,
          actorId: auditData.actorId,
          actorTag: auditData.actorTag,
          targetId: auditData.targetId,
          targetTag: auditData.targetTag,
          reason: auditData.reason,
          changes: auditData.changes as Prisma.InputJsonValue,
          chainOfCustodyHash: hash,
          createdAt: entry.createdAt,
        },
      });

      logger.debug(
        `Audit log archived: ${entry.actionType} (ID: ${entry.id}, Hash: ${hash.substring(0, 16)}...)`
      );

      return archived;
    } catch (error) {
      logger.error(`Error in cacheAuditLog:`, error);
      throw error;
    }
  }

  /**
   * Export audit log to SIEM (Splunk/Elasticsearch)
   *
   * @param entry - Discord audit log entry
   * @param guildId - Guild ID
   * @returns True if export successful
   */
  async exportToSIEM(entry: GuildAuditLogsEntry, guildId: string): Promise<boolean> {
    try {
      const siemEnabled = process.env.SIEM_ENABLED === 'true';
      const siemType = process.env.SIEM_TYPE; // 'splunk' | 'elasticsearch'
      const siemUrl = process.env.SIEM_URL;
      const siemApiKey = process.env.SIEM_API_KEY;

      if (!siemEnabled || !siemUrl || !siemApiKey) {
        logger.debug('SIEM export disabled or not configured');
        return false;
      }

      // Generate forensic metadata
      const forensicMeta = createForensicMetadata({
        discordAuditLogId: entry.id,
        actionType: entry.actionType,
        executorId: entry.executorId,
        targetId: entry.targetId,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      });

      // Prepare SIEM payload
      const siemPayload = {
        timestamp: entry.createdAt.toISOString(),
        source: 'maximus_discord_bot',
        guild_id: guildId,
        event_type: entry.actionType,
        actor: {
          user_id: entry.executorId,
          username: entry.executor?.tag,
        },
        target: {
          user_id: entry.targetId,
          username: entry.target && 'tag' in entry.target ? (entry.target as any).tag : undefined,
        },
        reason: entry.reason,
        changes: entry.changes,
        metadata: {
          bot_version: '2.0.0',
          ...forensicMeta,
        },
      };

      // Export based on SIEM type
      if (siemType === 'splunk') {
        await this.exportToSplunk(siemUrl, siemApiKey, siemPayload);
      } else if (siemType === 'elasticsearch') {
        await this.exportToElasticsearch(siemUrl, siemApiKey, siemPayload);
      }

      logger.debug(`Audit log exported to ${siemType}: ${entry.id}`);
      return true;
    } catch (error) {
      logger.error(`Error in exportToSIEM:`, error);
      return false;
    }
  }

  /**
   * Export to Splunk HTTP Event Collector (HEC)
   */
  private async exportToSplunk(
    url: string,
    apiKey: string,
    payload: Record<string, any>
  ): Promise<void> {
    const response = await fetch(`${url}/services/collector/event`, {
      method: 'POST',
      headers: {
        'Authorization': `Splunk ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: payload,
        sourcetype: 'discord:audit_log',
        index: 'discord_security',
      }),
    });

    if (!response.ok) {
      throw new Error(`Splunk export failed: ${response.statusText}`);
    }
  }

  /**
   * Export to Elasticsearch Bulk API
   */
  private async exportToElasticsearch(
    url: string,
    apiKey: string,
    payload: Record<string, any>
  ): Promise<void> {
    const indexName = `discord-audit-logs-${new Date().toISOString().split('T')[0]}`;

    const response = await fetch(`${url}/${indexName}/_doc`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Elasticsearch export failed: ${response.statusText}`);
    }
  }

  /**
   * Batch export historical audit logs (for compliance requirements)
   *
   * @param guildId - Guild ID
   * @param startDate - Start date for export
   * @param endDate - End date for export
   * @returns Number of logs exported
   */
  async batchExportAuditLogs(
    guildId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const archivedLogs = await prisma.archivedAuditLog.findMany({
        where: {
          guildId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          exportedToSIEM: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      logger.info(`Batch exporting ${archivedLogs.length} audit logs for guild ${guildId}`);

      let successCount = 0;

      for (const log of archivedLogs) {
        // Reconstruct entry format for SIEM export
        const reconstructedEntry = {
          id: log.discordAuditLogId,
          actionType: log.actionType,
          executorId: log.actorId,
          executor: log.actorTag ? { tag: log.actorTag } : undefined,
          targetId: log.targetId,
          target: log.targetTag ? { tag: log.targetTag } : undefined,
          reason: log.reason,
          changes: log.changes,
          createdAt: log.createdAt,
        } as any;

        const success = await this.exportToSIEM(reconstructedEntry, log.guildId);

        if (success) {
          // Mark as exported
          await prisma.archivedAuditLog.update({
            where: { id: log.id },
            data: {
              exportedToSIEM: true,
              siemExportDate: new Date(),
            },
          });

          successCount++;
        }
      }

      logger.info(`Batch export complete: ${successCount}/${archivedLogs.length} exported`);

      return successCount;
    } catch (error) {
      logger.error(`Error in batchExportAuditLogs:`, error);
      throw error;
    }
  }

  /**
   * Generate chain of custody hash for verification
   *
   * @param entry - Audit log entry
   * @returns SHA-256 hash
   */
  generateChainOfCustody(entry: GuildAuditLogsEntry): string {
    return generateChainOfCustodyHash({
      discordAuditLogId: entry.id,
      actionType: entry.actionType,
      executorId: entry.executorId,
      targetId: entry.targetId,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    });
  }

  /**
   * Get archived audit logs for a guild
   */
  async getArchivedLogs(
    guildId: string,
    filters?: {
      actionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ArchivedAuditLog[]> {
    try {
      const where: Prisma.ArchivedAuditLogWhereInput = {
        guildId,
      };

      if (filters?.actionType) {
        where.actionType = filters.actionType;
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const logs = await prisma.archivedAuditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 100,
      });

      return logs;
    } catch (error) {
      logger.error(`Error in getArchivedLogs:`, error);
      throw error;
    }
  }
}
