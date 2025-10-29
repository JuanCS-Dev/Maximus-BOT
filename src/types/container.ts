import type {
  Guild,
  GuildSettings,
  User,
  Warning,
  AuditLog,
  AuditAction,
  CustomCommand,
  ReactionRole
} from '@prisma/client';

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
