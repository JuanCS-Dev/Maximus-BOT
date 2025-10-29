import type {
  Guild,
  GuildSettings,
  User,
  Warning,
  AuditLog,
  AuditAction,
  CustomCommand,
  ReactionRole,
  ArchivedAuditLog
} from '@prisma/client';
import type { GuildAuditLogsEntry, GuildMember } from 'discord.js';

/**
 * Dependency Injection Symbols
 * Used with Inversify to identify service types
 */
export const TYPES = {
  // Core Services
  GuildService: Symbol.for('GuildService'),
  UserService: Symbol.for('UserService'),
  ModerationService: Symbol.for('ModerationService'),
  WarningService: Symbol.for('WarningService'),
  CustomCommandService: Symbol.for('CustomCommandService'),
  ReactionRoleService: Symbol.for('ReactionRoleService'),
  AuditLogService: Symbol.for('AuditLogService'),

  // Security Services (Phase 2.2 & 2.3)
  ForensicExportService: Symbol.for('ForensicExportService'),
  AntiRaidService: Symbol.for('AntiRaidService'),

  // Threat Intelligence Services (Phase 3.1)
  ThreatIntelligenceService: Symbol.for('ThreatIntelligenceService'),

  // Threat Detection Services (Phase 3.2)
  ThreatDetectionService: Symbol.for('ThreatDetectionService'),

  // Incident Response Services (Phase 4.1)
  IncidentResponseService: Symbol.for('IncidentResponseService'),

  // Metrics Services (Phase 5.4)
  MetricsService: Symbol.for('MetricsService'),

  // Infrastructure
  DatabaseClient: Symbol.for('DatabaseClient'),
  CacheClient: Symbol.for('CacheClient'),
  Logger: Symbol.for('Logger'),

  // Discord
  DiscordClient: Symbol.for('DiscordClient'),
} as const;

/**
 * Service Interface Definitions
 * These will be implemented by concrete service classes
 */

export interface IGuildService {
  getOrCreateGuild(guildId: string, guildName: string, iconUrl?: string): Promise<Guild>;
  getGuildSettings(guildId: string): Promise<GuildSettings>;
  updateGuildSettings(
    guildId: string,
    settings: Partial<Omit<GuildSettings, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<GuildSettings>;
  deleteGuild(guildId: string): Promise<void>;
}

export interface IUserService {
  getOrCreateUser(
    userId: string,
    username: string,
    discriminator: string,
    avatarUrl?: string,
    isBot?: boolean
  ): Promise<User>;
  updateUser(
    userId: string,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User>;
  getUser(userId: string): Promise<User | null>;
}

export interface IModerationService {
  banUser(guildId: string, userId: string, moderatorId: string, reason?: string): Promise<void>;
  kickUser(guildId: string, userId: string, moderatorId: string, reason?: string): Promise<void>;
  muteUser(guildId: string, userId: string, moderatorId: string, duration?: number, reason?: string): Promise<void>;
  unmuteUser(guildId: string, userId: string, moderatorId: string): Promise<void>;
}

export interface IWarningService {
  addWarning(
    userId: string,
    guildId: string,
    moderatorId: string,
    moderatorTag: string,
    reason: string
  ): Promise<Warning>;
  getWarnings(userId: string, guildId: string): Promise<Warning[]>;
  getActiveWarningsCount(userId: string, guildId: string): Promise<number>;
  clearWarnings(userId: string, guildId: string, clearedBy: string): Promise<number>;
  clearWarning(warningId: string, clearedBy: string): Promise<void>;
}

export interface ICustomCommandService {
  createCommand(
    guildId: string,
    trigger: string,
    response: string,
    createdBy: string,
    options?: { aliases?: string[] }
  ): Promise<CustomCommand>;
  getCommand(guildId: string, trigger: string): Promise<CustomCommand | null>;
  getAllCommands(guildId: string): Promise<CustomCommand[]>;
  updateCommand(
    guildId: string,
    trigger: string,
    data: Partial<Omit<CustomCommand, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>,
    updatedBy: string
  ): Promise<CustomCommand>;
  deleteCommand(guildId: string, trigger: string): Promise<void>;
  incrementUseCount(commandId: string): Promise<void>;
}

export interface IReactionRoleService {
  createReactionRole(
    guildId: string,
    channelId: string,
    messageId: string,
    roleMapping: Record<string, string>,
    createdBy: string,
    options?: { description?: string }
  ): Promise<ReactionRole>;
  getReactionRole(messageId: string): Promise<ReactionRole | null>;
  deleteReactionRole(messageId: string): Promise<void>;
  getAllReactionRoles(guildId: string): Promise<ReactionRole[]>;
}

export interface IAuditLogService {
  logAction(
    guildId: string,
    targetUserId: string,
    action: AuditAction,
    moderatorId: string,
    moderatorTag: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog>;
  getAuditLogs(
    guildId: string,
    filters?: {
      action?: AuditAction;
      targetUserId?: string;
      moderatorId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLog[]>;
  getUserAuditLogs(userId: string, guildId: string): Promise<AuditLog[]>;
}

/**
 * Security Services (Phase 2.2 & 2.3)
 */

export interface IForensicExportService {
  cacheAuditLog(entry: GuildAuditLogsEntry, guildId: string): Promise<ArchivedAuditLog>;
  exportToSIEM(entry: GuildAuditLogsEntry, guildId: string): Promise<boolean>;
  batchExportAuditLogs(guildId: string, startDate: Date, endDate: Date): Promise<number>;
  generateChainOfCustody(entry: GuildAuditLogsEntry): string;
  getArchivedLogs(
    guildId: string,
    filters?: {
      actionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ArchivedAuditLog[]>;
}

export interface IAntiRaidService {
  detectMassJoin(guildId: string): Promise<boolean>;
  validateAccountAge(member: GuildMember, minAgeDays?: number): Promise<boolean>;
  triggerAutoMitigation(member: GuildMember): Promise<void>;
  isAntiRaidEnabled(guildId: string): Promise<boolean>;
  getRaidStats(guildId: string): Promise<{
    totalRaids: number;
    lastRaidDate: Date | null;
    totalKicked: number;
  }>;
  resetRaidDetection(guildId: string): Promise<void>;
}

/**
 * Threat Intelligence Services (Phase 3.1)
 */

export interface IThreatIntelligenceService {
  queryMISP(ioc: string, iocType: string): Promise<MISPEvent | null>;
  reportSighting(ioc: string, guildId: string): Promise<boolean>;
  createMISPEvent(threat: ThreatData, guildId: string): Promise<MISPEvent | null>;
  queryOpenCTI(indicator: string): Promise<OpenCTIIndicator | null>;
  forwardToVerticeMaximus(threat: ThreatData): Promise<boolean>;
}

/**
 * Type Definitions for Threat Intelligence
 */

export interface MISPEvent {
  id: string;
  info: string;
  threat_level_id: string;
  analysis: string;
  tags: string[];
  date: string;
  orgName: string;
  galaxies: string[];
  attributes: number;
}

export interface OpenCTIIndicator {
  id: string;
  name: string;
  pattern: string;
  description: string;
  createdBy: string;
  labels: string[];
  marking: string[];
}

export interface ThreatData {
  type: string;
  description: string;
  score: number;
  ioc: string;
  iocType: string;
  guildId: string;
  userId?: string;
  messageId?: string;
  attachmentHashes?: string[];
  detectionMethod?: string;
}

/**
 * Threat Detection Services (Phase 3.2)
 */

export interface IThreatDetectionService {
  analyzeMessage(message: any): Promise<ThreatAnalysisResult>;
  checkURLReputation(urls: string[]): Promise<ThreatDetection | null>;
  scanAttachments(attachments: any): Promise<ThreatDetection[]>;
  analyzeContent(content: string): Promise<ThreatDetection | null>;
  extractIOCs(content: string): IOCExtraction;
}

export interface ThreatAnalysisResult {
  threatScore: number;
  threats: ThreatDetection[];
  iocs: IOCExtraction;
  shouldBlock: boolean;
  suggestedAction: 'none' | 'alert_mods' | 'delete_message' | 'timeout_user' | 'ban_user';
}

export interface ThreatDetection {
  type: string;
  description: string;
  score: number;
  ioc: string;
  iocType: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface IOCExtraction {
  urls: string[];
  ips: string[];
  domains: string[];
  emails: string[];
  hashes: string[];
}

/**
 * Incident Response Services (Phase 4.1)
 */

export interface IIncidentResponseService {
  createInteractiveAlert(
    client: any,
    guildId: string,
    threat: ThreatAlertData
  ): Promise<string | null>;
  handleInteractionResponse(interaction: any): Promise<boolean>;
  updateAlertStatus(
    alertMessageId: string,
    action: string,
    analyst: string,
    success: boolean
  ): Promise<void>;
}

export interface ThreatAlertData {
  guildId: string;
  channelId: string;
  messageId: string;
  userId: string;
  username: string;
  threatType: string;
  threatScore: number;
  description: string;
  ioc?: string;
  iocType?: string;
  detectionSource?: string;
  mispEvent?: {
    id: string;
    info: string;
    threat_level_id: string;
    tags: string[];
  };
  openCTIIndicator?: {
    id: string;
    name: string;
    description: string;
    labels: string[];
  };
}

/**
 * Metrics Services (Phase 5.4)
 */

export interface IMetricsService {
  getMetrics(): Promise<string>;
  updateBotHealth(uptime: number, memoryUsage: NodeJS.MemoryUsage): void;
  updateDiscordStats(guilds: number, users: number, channels: number): void;
  recordMessage(guildId: string): void;
  recordThreatDetection(type: string, score: number): void;
  recordAlert(severity: string): void;
  recordIncident(type: string, severity: string): void;
  recordCommandExecution(command: string, guildId: string, duration: number): void;
  recordCommandError(command: string, errorType: string): void;
  recordAPICall(api: string, method: string, status: string, duration: number): void;
  recordAPIError(api: string, errorType: string): void;
}
