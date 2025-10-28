/**
 * Dependency Injection Symbols
 * Used with Inversify to identify service types
 */
export const TYPES = {
  // Services
  GuildService: Symbol.for('GuildService'),
  UserService: Symbol.for('UserService'),
  ModerationService: Symbol.for('ModerationService'),
  WarningService: Symbol.for('WarningService'),
  CustomCommandService: Symbol.for('CustomCommandService'),
  ReactionRoleService: Symbol.for('ReactionRoleService'),
  AuditLogService: Symbol.for('AuditLogService'),

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
  getOrCreateGuild(guildId: string, guildName: string, iconUrl?: string): Promise<any>;
  getGuildSettings(guildId: string): Promise<any>;
  updateGuildSettings(guildId: string, settings: any): Promise<any>;
  deleteGuild(guildId: string): Promise<void>;
}

export interface IUserService {
  getOrCreateUser(userId: string, username: string, discriminator: string, avatarUrl?: string, isBot?: boolean): Promise<any>;
  updateUser(userId: string, data: any): Promise<any>;
  getUser(userId: string): Promise<any | null>;
}

export interface IModerationService {
  banUser(guildId: string, userId: string, moderatorId: string, reason?: string): Promise<void>;
  kickUser(guildId: string, userId: string, moderatorId: string, reason?: string): Promise<void>;
  muteUser(guildId: string, userId: string, moderatorId: string, duration?: number, reason?: string): Promise<void>;
  unmuteUser(guildId: string, userId: string, moderatorId: string): Promise<void>;
}

export interface IWarningService {
  addWarning(userId: string, guildId: string, moderatorId: string, moderatorTag: string, reason: string): Promise<any>;
  getWarnings(userId: string, guildId: string): Promise<any[]>;
  getActiveWarningsCount(userId: string, guildId: string): Promise<number>;
  clearWarnings(userId: string, guildId: string, clearedBy: string): Promise<number>;
  clearWarning(warningId: string, clearedBy: string): Promise<void>;
}

export interface ICustomCommandService {
  createCommand(guildId: string, trigger: string, response: string, createdBy: string, options?: any): Promise<any>;
  getCommand(guildId: string, trigger: string): Promise<any | null>;
  getAllCommands(guildId: string): Promise<any[]>;
  updateCommand(guildId: string, trigger: string, data: any, updatedBy: string): Promise<any>;
  deleteCommand(guildId: string, trigger: string): Promise<void>;
  incrementUseCount(commandId: string): Promise<void>;
}

export interface IReactionRoleService {
  createReactionRole(guildId: string, channelId: string, messageId: string, roleMapping: any, createdBy: string, options?: any): Promise<any>;
  getReactionRole(messageId: string): Promise<any | null>;
  deleteReactionRole(messageId: string): Promise<void>;
  getAllReactionRoles(guildId: string): Promise<any[]>;
}

export interface IAuditLogService {
  logAction(guildId: string, targetUserId: string, action: string, moderatorId: string, moderatorTag: string, reason?: string, metadata?: any): Promise<any>;
  getAuditLogs(guildId: string, filters?: any): Promise<any[]>;
  getUserAuditLogs(userId: string, guildId: string): Promise<any[]>;
}
