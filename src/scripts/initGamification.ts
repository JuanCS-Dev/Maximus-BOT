/**
 * Initialize Gamification System
 *
 * Creates default badges and prepares the system
 * Run this after database migration
 */

import { GamificationService } from '../services/GamificationService';
import { Container } from 'inversify';
import { TYPES } from '../types/container';
import { logger } from '../utils/logger';
import 'reflect-metadata';

async function main() {
  try {
    logger.info('🎮 Initializing Gamification System...');

    // Create a minimal container for this script
    const container = new Container();
    container.bind<GamificationService>(TYPES.GamificationService).to(GamificationService).inSingletonScope();

    const gamificationService = container.get<GamificationService>(TYPES.GamificationService);

    // Create default badges
    await gamificationService.createDefaultBadges();

    logger.info('✅ Gamification system initialized successfully!');
    logger.info('');
    logger.info('Default badges created:');
    logger.info('  👋 First Steps - Send your first message');
    logger.info('  💬 Chatterbox - Send 100 messages');
    logger.info('  🗣️ Conversationalist - Send 1,000 messages');
    logger.info('  ⭐ Level 10 - Reach level 10');
    logger.info('  🌟 Level 25 - Reach level 25');
    logger.info('  🎤 Voice Champion - Spend 100 hours in voice');
    logger.info('  👑 Legend - Reach level 50');
    logger.info('');
    logger.info('System is ready! Users will now earn XP for messages.');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error initializing gamification:', error);
    process.exit(1);
  }
}

main();
