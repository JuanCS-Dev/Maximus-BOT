import { injectable } from 'inversify';
import { User } from '@prisma/client';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import type { IUserService } from '../types/container';

/**
 * User Service
 * Manages user data
 */
@injectable()
export class UserService implements IUserService {
  /**
   * Get or create a user in the database
   */
  async getOrCreateUser(
    userId: string,
    username: string,
    discriminator: string,
    avatarUrl?: string,
    isBot = false
  ): Promise<User> {
    try {
      // Try to get from database
      let user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            id: userId,
            username,
            discriminator,
            avatarUrl: avatarUrl || null,
            isBot,
          },
        });

        logger.debug(`Created new user: ${username}#${discriminator} (${userId})`);
      } else if (
        user.username !== username ||
        user.discriminator !== discriminator ||
        user.avatarUrl !== avatarUrl
      ) {
        // Update user info if changed
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            username,
            discriminator,
            avatarUrl: avatarUrl || null,
          },
        });
      }

      return user;
    } catch (error) {
      logger.error(`Error in getOrCreateUser for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error(`Error in getUser for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user data
   */
  async updateUser(
    userId: string,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });

      logger.debug(`Updated user ${userId}`);
      return user;
    } catch (error) {
      logger.error(`Error in updateUser for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user and all related data
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`Deleted user ${userId} and all related data`);
    } catch (error) {
      logger.error(`Error in deleteUser for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      return user !== null;
    } catch (error) {
      logger.error(`Error in userExists for ${userId}:`, error);
      return false;
    }
  }
}
