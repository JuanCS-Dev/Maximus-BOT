import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types/container';
import type {
  IGuildService,
  IUserService,
  IModerationService,
  IWarningService,
  ICustomCommandService,
  IReactionRoleService,
  IAuditLogService,
} from './types/container';

// Import services
import { GuildService } from './services/GuildService';
import { UserService } from './services/UserService';
import { ModerationService } from './services/ModerationService';
import { WarningService } from './services/WarningService';
import { AuditLogService } from './services/AuditLogService';

/**
 * Inversify Container
 * Central registry for all dependencies
 */
const container = new Container();

/**
 * Bind services to the container
 * This is where we configure dependency injection
 */
export function configureContainer(): Container {
  // Bind services - all in singleton scope for performance
  container.bind<IGuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();
  container.bind<IUserService>(TYPES.UserService).to(UserService).inSingletonScope();
  container.bind<IModerationService>(TYPES.ModerationService).to(ModerationService).inSingletonScope();
  container.bind<IWarningService>(TYPES.WarningService).to(WarningService).inSingletonScope();
  container.bind<IAuditLogService>(TYPES.AuditLogService).to(AuditLogService).inSingletonScope();

  // CustomCommandService and ReactionRoleService will be added in Phase 2
  // container.bind<ICustomCommandService>(TYPES.CustomCommandService).to(CustomCommandService).inSingletonScope();
  // container.bind<IReactionRoleService>(TYPES.ReactionRoleService).to(ReactionRoleService).inSingletonScope();

  return container;
}

/**
 * Get a service from the container
 *
 * Example usage:
 * const guildService = getService<IGuildService>(TYPES.GuildService);
 */
export function getService<T>(serviceIdentifier: symbol): T {
  return container.get<T>(serviceIdentifier);
}

/**
 * Check if a service is bound
 */
export function hasService(serviceIdentifier: symbol): boolean {
  return container.isBound(serviceIdentifier);
}

// Initialize container
configureContainer();

export { container };
export default container;
