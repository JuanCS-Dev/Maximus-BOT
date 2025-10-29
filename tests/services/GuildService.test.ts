/**
 * GuildService Unit Tests
 * Tests for guild management service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuildService } from '@/services/GuildService';
import { createGuildFactory, createGuildSettingsFactory } from '@tests/helpers/factories';
import type { Guild, GuildSettings } from '@prisma/client';

// Mock Prisma client
vi.mock('@/database/client', () => ({
  prisma: {
    guild: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    guildSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Redis
vi.mock('@/cache/redis', () => ({
  getCached: vi.fn(),
  setCached: vi.fn(),
  deleteCached: vi.fn(),
  CacheKeys: {
    GUILD_SETTINGS: (guildId: string) => `guild_settings:${guildId}`,
  },
  CacheTTL: {
    GUILD_SETTINGS: 300,
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

import { prisma } from '@/database/client';
import { getCached, setCached, deleteCached } from '@/cache/redis';

describe('GuildService', () => {
  let service: GuildService;

  beforeEach(() => {
    service = new GuildService();
    vi.clearAllMocks();
  });

  describe('getOrCreateGuild', () => {
    it.skip('should return existing guild if found', async () => {
      // TODO: Fix mock initialization issue
      const mockGuild = createGuildFactory({ id: '123', name: 'Test Guild' });
      vi.mocked(prisma.guild.findUnique).mockResolvedValueOnce(mockGuild);

      const result = await service.getOrCreateGuild('123', 'Test Guild');

      expect(result).toEqual(mockGuild);
      expect(prisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(prisma.guild.create).not.toHaveBeenCalled();
    });

    it('should create guild if not found', async () => {
      const mockGuild = createGuildFactory({ id: '123', name: 'New Guild' });
      vi.mocked(prisma.guild.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.guild.create).mockResolvedValue(mockGuild);
      vi.mocked(prisma.guildSettings.create).mockResolvedValue(createGuildSettingsFactory());

      const result = await service.getOrCreateGuild('123', 'New Guild', 'icon.png');

      expect(result).toEqual(mockGuild);
      expect(prisma.guild.create).toHaveBeenCalledWith({
        data: {
          id: '123',
          name: 'New Guild',
          iconUrl: 'icon.png',
        },
      });
      expect(prisma.guildSettings.create).toHaveBeenCalledWith({
        data: { guildId: '123' },
      });
    });

    it('should update guild if name changed', async () => {
      const oldGuild = createGuildFactory({ id: '123', name: 'Old Name' });
      const updatedGuild = createGuildFactory({ id: '123', name: 'New Name' });
      vi.mocked(prisma.guild.findUnique).mockResolvedValue(oldGuild);
      vi.mocked(prisma.guild.update).mockResolvedValue(updatedGuild);

      const result = await service.getOrCreateGuild('123', 'New Name');

      expect(result).toEqual(updatedGuild);
      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          name: 'New Name',
          iconUrl: null,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guild.findUnique).mockRejectedValue(new Error('Database error'));

      await expect(service.getOrCreateGuild('123', 'Test')).rejects.toThrow('Database error');
    });
  });

  describe('getGuildSettings', () => {
    it('should return cached settings if available', async () => {
      const mockSettings = createGuildSettingsFactory({ guildId: '123' });
      vi.mocked(getCached).mockResolvedValue(mockSettings);

      const result = await service.getGuildSettings('123');

      expect(result).toEqual(mockSettings);
      expect(getCached).toHaveBeenCalledWith('guild_settings:123');
      expect(prisma.guildSettings.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const mockSettings = createGuildSettingsFactory({ guildId: '123' });
      vi.mocked(getCached).mockResolvedValue(null);
      vi.mocked(prisma.guildSettings.findUnique).mockResolvedValue(mockSettings);

      const result = await service.getGuildSettings('123');

      expect(result).toEqual(mockSettings);
      expect(prisma.guildSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId: '123' },
      });
      expect(setCached).toHaveBeenCalledWith('guild_settings:123', mockSettings, 300);
    });

    it('should create settings if not found', async () => {
      const mockSettings = createGuildSettingsFactory({ guildId: '123' });
      vi.mocked(getCached).mockResolvedValue(null);
      vi.mocked(prisma.guildSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.guildSettings.create).mockResolvedValue(mockSettings);

      const result = await service.getGuildSettings('123');

      expect(result).toEqual(mockSettings);
      expect(prisma.guildSettings.create).toHaveBeenCalledWith({
        data: { guildId: '123' },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getCached).mockRejectedValue(new Error('Redis error'));

      await expect(service.getGuildSettings('123')).rejects.toThrow('Redis error');
    });
  });

  describe('updateGuildSettings', () => {
    it('should update settings and invalidate cache', async () => {
      const updatedSettings = createGuildSettingsFactory({ guildId: '123', maxWarnings: 5 });
      vi.mocked(prisma.guildSettings.update).mockResolvedValue(updatedSettings);

      const result = await service.updateGuildSettings('123', { maxWarnings: 5 });

      expect(result).toEqual(updatedSettings);
      expect(prisma.guildSettings.update).toHaveBeenCalledWith({
        where: { guildId: '123' },
        data: { maxWarnings: 5 },
      });
      expect(deleteCached).toHaveBeenCalledWith('guild_settings:123');
    });

    it('should handle partial updates', async () => {
      const updatedSettings = createGuildSettingsFactory({
        guildId: '123',
        welcomeMessage: 'Welcome!',
      });
      vi.mocked(prisma.guildSettings.update).mockResolvedValue(updatedSettings);

      const result = await service.updateGuildSettings('123', { welcomeMessage: 'Welcome!' });

      expect(result).toEqual(updatedSettings);
      expect(prisma.guildSettings.update).toHaveBeenCalledWith({
        where: { guildId: '123' },
        data: { welcomeMessage: 'Welcome!' },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guildSettings.update).mockRejectedValue(new Error('Update failed'));

      await expect(service.updateGuildSettings('123', { maxWarnings: 5 })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('deleteGuild', () => {
    it('should delete guild and invalidate cache', async () => {
      vi.mocked(prisma.guild.delete).mockResolvedValue(createGuildFactory());

      await service.deleteGuild('123');

      expect(prisma.guild.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(deleteCached).toHaveBeenCalledWith('guild_settings:123');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guild.delete).mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteGuild('123')).rejects.toThrow('Delete failed');
    });
  });

  describe('getGuild', () => {
    it('should return guild if found', async () => {
      const mockGuild = createGuildFactory({ id: '123' });
      vi.mocked(prisma.guild.findUnique).mockResolvedValue(mockGuild);

      const result = await service.getGuild('123');

      expect(result).toEqual(mockGuild);
      expect(prisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.guild.findUnique).mockResolvedValue(null);

      const result = await service.getGuild('123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guild.findUnique).mockRejectedValue(new Error('Database error'));

      await expect(service.getGuild('123')).rejects.toThrow('Database error');
    });
  });

  describe('updateGuild', () => {
    it('should update guild name', async () => {
      const updatedGuild = createGuildFactory({ id: '123', name: 'New Name' });
      vi.mocked(prisma.guild.update).mockResolvedValue(updatedGuild);

      const result = await service.updateGuild('123', { name: 'New Name' });

      expect(result).toEqual(updatedGuild);
      expect(prisma.guild.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { name: 'New Name' },
      });
    });

    it('should update guild icon', async () => {
      const updatedGuild = createGuildFactory({ id: '123', iconUrl: 'newicon.png' });
      vi.mocked(prisma.guild.update).mockResolvedValue(updatedGuild);

      const result = await service.updateGuild('123', { iconUrl: 'newicon.png' });

      expect(result).toEqual(updatedGuild);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guild.update).mockRejectedValue(new Error('Update failed'));

      await expect(service.updateGuild('123', { name: 'New Name' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('syncGuilds', () => {
    it('should sync multiple guilds', async () => {
      const guilds = [
        { id: '1', name: 'Guild 1', iconUrl: 'icon1.png' },
        { id: '2', name: 'Guild 2', iconUrl: 'icon2.png' },
      ];

      vi.mocked(prisma.guild.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.guild.create).mockResolvedValue(createGuildFactory());
      vi.mocked(prisma.guildSettings.create).mockResolvedValue(createGuildSettingsFactory());

      await service.syncGuilds(guilds);

      expect(prisma.guild.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.guild.create).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.guild.findUnique).mockRejectedValue(new Error('Sync error'));

      await expect(service.syncGuilds([{ id: '1', name: 'Guild 1' }])).rejects.toThrow(
        'Sync error'
      );
    });
  });
});
