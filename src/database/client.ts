import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient exists throughout the application
 */
class DatabaseClient {
  private static instance: PrismaClient | null = null;
  private static isConnected = false;

  /**
   * Get the PrismaClient instance (singleton pattern)
   */
  static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ],
      });

      // Log database warnings
      DatabaseClient.instance.$on('warn', (e) => {
        logger.warn(`Database warning: ${e.message}`);
      });

      // Log database errors
      DatabaseClient.instance.$on('error', (e) => {
        logger.error(`Database error: ${e.message}`);
      });
    }

    return DatabaseClient.instance;
  }

  /**
   * Connect to the database
   */
  static async connect(): Promise<void> {
    if (DatabaseClient.isConnected) {
      logger.debug('Database already connected');
      return;
    }

    try {
      const client = DatabaseClient.getInstance();
      await client.$connect();
      DatabaseClient.isConnected = true;
      logger.info('✅ Connected to PostgreSQL database');

      // Test the connection
      await client.$queryRaw`SELECT 1`;
      logger.debug('Database connection test successful');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  static async disconnect(): Promise<void> {
    if (!DatabaseClient.instance || !DatabaseClient.isConnected) {
      return;
    }

    try {
      await DatabaseClient.instance.$disconnect();
      DatabaseClient.isConnected = false;
      logger.info('Disconnected from database');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  static getConnectionStatus(): boolean {
    return DatabaseClient.isConnected;
  }

  /**
   * Health check - verify database is responsive
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = DatabaseClient.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export the singleton instance getter
export const prisma = DatabaseClient.getInstance();

// Export utility functions
export const {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  getConnectionStatus,
  healthCheck: databaseHealthCheck,
} = DatabaseClient;
