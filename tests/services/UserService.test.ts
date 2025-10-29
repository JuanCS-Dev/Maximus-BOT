/**
 * UserService Unit Tests
 * Tests for user management service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@/services/UserService';
import { createUserFactory } from '@tests/helpers/factories';
import type { User } from '@prisma/client';

// Mock Prisma client
vi.mock('@/database/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  describe('getOrCreateUser', () => {
    it('should create user if not found', async () => {
      const mockUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '1234',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const result = await service.getOrCreateUser('123', 'testuser', '1234', 'avatar.png', false);

      expect(result).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: '123',
          username: 'testuser',
          discriminator: '1234',
          avatarUrl: 'avatar.png',
          isBot: false,
        },
      });
    });

    it('should return existing user without changes', async () => {
      const mockUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '1234',
        avatarUrl: 'avatar.png',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await service.getOrCreateUser('123', 'testuser', '1234', 'avatar.png');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should update user if username changed', async () => {
      const oldUser = createUserFactory({
        id: '123',
        username: 'oldname',
        discriminator: '1234',
      });
      const updatedUser = createUserFactory({
        id: '123',
        username: 'newname',
        discriminator: '1234',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(oldUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.getOrCreateUser('123', 'newname', '1234');

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          username: 'newname',
          discriminator: '1234',
          avatarUrl: null,
        },
      });
    });

    it('should update user if discriminator changed', async () => {
      const oldUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '1234',
      });
      const updatedUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '5678',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(oldUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.getOrCreateUser('123', 'testuser', '5678');

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should update user if avatar changed', async () => {
      const oldUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '1234',
        avatarUrl: 'old.png',
      });
      const updatedUser = createUserFactory({
        id: '123',
        username: 'testuser',
        discriminator: '1234',
        avatarUrl: 'new.png',
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(oldUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.getOrCreateUser('123', 'testuser', '1234', 'new.png');

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          username: 'testuser',
          discriminator: '1234',
          avatarUrl: 'new.png',
        },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      await expect(service.getOrCreateUser('123', 'test', '1234')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getUser', () => {
    it('should return user if found', async () => {
      const mockUser = createUserFactory({ id: '123' });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const result = await service.getUser('123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return null if not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.getUser('123');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      await expect(service.getUser('123')).rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    it('should update user username', async () => {
      const updatedUser = createUserFactory({ id: '123', username: 'newname' });
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser('123', { username: 'newname' });

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { username: 'newname' },
      });
    });

    it('should update user avatar', async () => {
      const updatedUser = createUserFactory({ id: '123', avatarUrl: 'new.png' });
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser('123', { avatarUrl: 'new.png' });

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { avatarUrl: 'new.png' },
      });
    });

    it('should handle partial updates', async () => {
      const updatedUser = createUserFactory({
        id: '123',
        username: 'updated',
        discriminator: '9999',
      });
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const result = await service.updateUser('123', {
        username: 'updated',
        discriminator: '9999',
      });

      expect(result).toEqual(updatedUser);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.user.update).mockRejectedValue(new Error('Update failed'));

      await expect(service.updateUser('123', { username: 'test' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      vi.mocked(prisma.user.delete).mockResolvedValue(createUserFactory());

      await service.deleteUser('123');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.user.delete).mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteUser('123')).rejects.toThrow('Delete failed');
    });
  });

  describe('userExists', () => {
    it('should return true if user exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: '123' } as User);

      const result = await service.userExists('123');

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: { id: true },
      });
    });

    it('should return false if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await service.userExists('123');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const result = await service.userExists('123');

      expect(result).toBe(false);
    });
  });
});
