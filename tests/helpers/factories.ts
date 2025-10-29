/**
 * Test Data Factories
 * Generate test data for Prisma models
 */

import type {
  Guild,
  GuildSettings,
  User,
  Warning,
  AuditLog,
  CustomCommand,
  ReactionRole,
  AuditAction,
} from '@prisma/client';

/**
 * Generate sequential IDs for testing
 */
let idCounter = 1;
export function resetIdCounter() {
  idCounter = 1;
}
function generateId(): string {
  return `test_${idCounter++}`;
}

/**
 * Factory: Guild
 */
export function createGuildFactory(overrides?: Partial<Guild>): Guild {
  return {
    id: generateId(),
    name: 'Test Guild',
    iconUrl: 'https://cdn.discordapp.com/icons/123/icon.png',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: GuildSettings
 */
export function createGuildSettingsFactory(overrides?: Partial<GuildSettings>): GuildSettings {
  return {
    id: generateId(),
    guildId: generateId(),
    maxWarnings: 3,
    muteDuration: 3600,
    logChannelId: null,
    welcomeChannelId: null,
    welcomeMessage: null,
    autoRole: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: User
 */
export function createUserFactory(overrides?: Partial<User>): User {
  const username = `TestUser${idCounter}`;
  return {
    id: generateId(),
    username,
    discriminator: '0001',
    avatarUrl: `https://cdn.discordapp.com/avatars/${idCounter}/avatar.png`,
    isBot: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: Warning
 */
export function createWarningFactory(overrides?: Partial<Warning>): Warning {
  return {
    id: generateId(),
    userId: generateId(),
    guildId: generateId(),
    moderatorId: generateId(),
    moderatorTag: 'Moderator#0001',
    reason: 'Test warning reason',
    active: true,
    clearedAt: null,
    clearedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: AuditLog
 */
export function createAuditLogFactory(overrides?: Partial<AuditLog>): AuditLog {
  return {
    id: generateId(),
    guildId: generateId(),
    targetUserId: generateId(),
    action: 'BAN' as AuditAction,
    moderatorId: generateId(),
    moderatorTag: 'Moderator#0001',
    reason: 'Test reason',
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: CustomCommand
 */
export function createCustomCommandFactory(overrides?: Partial<CustomCommand>): CustomCommand {
  return {
    id: generateId(),
    guildId: generateId(),
    trigger: 'testcommand',
    response: 'Test response',
    createdBy: generateId(),
    updatedBy: null,
    aliases: [],
    useCount: 0,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory: ReactionRole
 */
export function createReactionRoleFactory(overrides?: Partial<ReactionRole>): ReactionRole {
  return {
    id: generateId(),
    guildId: generateId(),
    channelId: generateId(),
    messageId: generateId(),
    roleMapping: {},
    createdBy: generateId(),
    description: null,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Batch factories
 */
export function createManyGuilds(count: number, overrides?: Partial<Guild>): Guild[] {
  return Array.from({ length: count }, () => createGuildFactory(overrides));
}

export function createManyUsers(count: number, overrides?: Partial<User>): User[] {
  return Array.from({ length: count }, () => createUserFactory(overrides));
}

export function createManyWarnings(count: number, overrides?: Partial<Warning>): Warning[] {
  return Array.from({ length: count }, () => createWarningFactory(overrides));
}

export function createManyAuditLogs(count: number, overrides?: Partial<AuditLog>): AuditLog[] {
  return Array.from({ length: count }, () => createAuditLogFactory(overrides));
}
