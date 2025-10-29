/**
 * Discord.js Mocks
 * Mock implementations for Discord.js interactions and objects
 */

import { vi } from 'vitest';
import type {
  ChatInputCommandInteraction,
  User,
  GuildMember,
  Guild,
  TextChannel,
  Role,
} from 'discord.js';

/**
 * Create a mock User
 */
export function createMockUser(overrides?: Partial<User>): Partial<User> {
  return {
    id: '123456789',
    username: 'TestUser',
    discriminator: '0001',
    tag: 'TestUser#0001',
    bot: false,
    avatar: 'avatar_hash',
    createdTimestamp: Date.now(),
    displayAvatarURL: vi.fn(() => 'https://cdn.discordapp.com/avatars/123/avatar.png'),
    avatarURL: vi.fn(() => 'https://cdn.discordapp.com/avatars/123/avatar.png'),
    fetch: vi.fn(async () => createMockUser()),
    send: vi.fn(async () => ({} as any)),
    ...overrides,
  } as Partial<User>;
}

/**
 * Create a mock Guild
 */
export function createMockGuild(overrides?: Partial<Guild>): Partial<Guild> {
  return {
    id: '987654321',
    name: 'Test Guild',
    iconURL: vi.fn(() => 'https://cdn.discordapp.com/icons/987/icon.png'),
    createdTimestamp: Date.now(),
    memberCount: 100,
    ownerId: '111111111',
    members: {
      fetch: vi.fn(async () => createMockGuildMember()),
      fetchMe: vi.fn(async () => createMockGuildMember()),
      cache: new Map(),
    } as any,
    channels: {
      cache: new Map(),
    } as any,
    roles: {
      cache: new Map(),
    } as any,
    emojis: {
      cache: new Map(),
    } as any,
    fetchOwner: vi.fn(async () => createMockGuildMember()),
    ...overrides,
  } as Partial<Guild>;
}

/**
 * Create a mock GuildMember
 */
export function createMockGuildMember(overrides?: Partial<GuildMember>): Partial<GuildMember> {
  const mockUser = createMockUser();

  return {
    id: mockUser.id,
    user: mockUser as User,
    guild: createMockGuild() as Guild,
    nickname: null,
    displayName: mockUser.username,
    joinedTimestamp: Date.now(),
    premiumSinceTimestamp: null,
    roles: {
      cache: new Map(),
      highest: {
        id: '999999999',
        name: '@everyone',
        position: 0,
      } as any,
      add: vi.fn(async () => ({} as any)),
      remove: vi.fn(async () => ({} as any)),
    } as any,
    permissions: {
      has: vi.fn(() => false),
    } as any,
    moderatable: true,
    kickable: true,
    bannable: true,
    manageable: true,
    displayAvatarURL: vi.fn(() => 'https://cdn.discordapp.com/avatars/123/avatar.png'),
    ban: vi.fn(async () => ({} as any)),
    kick: vi.fn(async () => ({} as any)),
    timeout: vi.fn(async () => ({} as any)),
    presence: null,
    avatar: null,
    communicationDisabledUntil: null,
    ...overrides,
  } as Partial<GuildMember>;
}

/**
 * Create a mock Role
 */
export function createMockRole(overrides?: Partial<Role>): Partial<Role> {
  return {
    id: '555555555',
    name: 'Test Role',
    position: 1,
    managed: false,
    toString: () => '<@&555555555>',
    ...overrides,
  } as Partial<Role>;
}

/**
 * Create a mock TextChannel
 */
export function createMockTextChannel(overrides?: Partial<TextChannel>): Partial<TextChannel> {
  return {
    id: '444444444',
    name: 'test-channel',
    isTextBased: () => true,
    send: vi.fn(async () => ({} as any)),
    bulkDelete: vi.fn(async () => new Map()),
    setRateLimitPerUser: vi.fn(async () => ({} as any)),
    permissionOverwrites: {
      edit: vi.fn(async () => ({} as any)),
    } as any,
    permissionsFor: vi.fn(() => ({
      has: vi.fn(() => true),
    })),
    ...overrides,
  } as Partial<TextChannel>;
}

/**
 * Create a mock ChatInputCommandInteraction
 */
export function createMockInteraction(
  overrides?: Partial<ChatInputCommandInteraction>
): Partial<ChatInputCommandInteraction> {
  const mockUser = createMockUser();
  const mockGuild = createMockGuild();
  const mockMember = createMockGuildMember({ user: mockUser as User });
  const mockChannel = createMockTextChannel();

  return {
    id: '333333333',
    user: mockUser as User,
    member: mockMember as GuildMember,
    guild: mockGuild as Guild,
    channel: mockChannel as TextChannel,
    channelId: mockChannel.id,
    client: {
      user: createMockUser({ id: '999999999', username: 'BotUser', bot: true }) as User,
    } as any,
    options: {
      getString: vi.fn((name: string, required?: boolean) => {
        if (name === 'pergunta') return 'Test question?';
        if (name === 'razao') return 'Test reason';
        return null;
      }),
      getUser: vi.fn(() => mockUser),
      getRole: vi.fn(() => createMockRole()),
      getChannel: vi.fn(() => mockChannel),
      getInteger: vi.fn(() => 100),
      getBoolean: vi.fn(() => true),
    } as any,
    reply: vi.fn(async () => ({} as any)),
    editReply: vi.fn(async () => ({} as any)),
    deferReply: vi.fn(async () => ({} as any)),
    followUp: vi.fn(async () => ({} as any)),
    deferred: false,
    replied: false,
    ...overrides,
  } as Partial<ChatInputCommandInteraction>;
}

/**
 * Reset all Discord mocks
 */
export function resetDiscordMocks() {
  vi.clearAllMocks();
}
