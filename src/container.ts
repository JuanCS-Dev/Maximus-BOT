import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types/container';
import type {
  IGuildService,
  IUserService,
  IModerationService,
  IWarningService,
  IAuditLogService,
  IForensicExportService,
  IAntiRaidService,
  IThreatIntelligenceService,
  IThreatDetectionService,
  IIncidentResponseService,
  IMetricsService,
} from './types/container';

// Import core services
import { GuildService } from './services/GuildService';
import { UserService } from './services/UserService';
import { ModerationService } from './services/ModerationService';
import { WarningService } from './services/WarningService';
import { AuditLogService } from './services/AuditLogService';

// Import security services (Phase 2.2 & 2.3)
import { ForensicExportService } from './services/ForensicExportService';
import { AntiRaidService } from './services/AntiRaidService';

// Import threat intelligence services (Phase 3.1)
import { ThreatIntelligenceService } from './services/ThreatIntelligenceService';

// Import threat detection services (Phase 3.2)
import { ThreatDetectionService } from './services/ThreatDetectionService';

// Import incident response services (Phase 4.1)
import { IncidentResponseService } from './services/IncidentResponseService';

// Import metrics services (Phase 5.4)
import { MetricsService } from './services/MetricsService';

// Import AI services (Phase 6.1)
import { AIAssistantService } from './services/AIAssistantService';
import { AutoModService } from './services/AutoModService';

// Import gamification services (Phase 6.2)
import { GamificationService } from './services/GamificationService';

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
  // Bind core services - all in singleton scope for performance
  container.bind<IGuildService>(TYPES.GuildService).to(GuildService).inSingletonScope();
  container.bind<IUserService>(TYPES.UserService).to(UserService).inSingletonScope();
  container.bind<IModerationService>(TYPES.ModerationService).to(ModerationService).inSingletonScope();
  container.bind<IWarningService>(TYPES.WarningService).to(WarningService).inSingletonScope();
  container.bind<IAuditLogService>(TYPES.AuditLogService).to(AuditLogService).inSingletonScope();

  // Bind security services (Phase 2.2 & 2.3)
  container.bind<IForensicExportService>(TYPES.ForensicExportService).to(ForensicExportService).inSingletonScope();
  container.bind<IAntiRaidService>(TYPES.AntiRaidService).to(AntiRaidService).inSingletonScope();

  // Bind threat intelligence services (Phase 3.1)
  container.bind<IThreatIntelligenceService>(TYPES.ThreatIntelligenceService).to(ThreatIntelligenceService).inSingletonScope();

  // Bind threat detection services (Phase 3.2)
  container.bind<IThreatDetectionService>(TYPES.ThreatDetectionService).to(ThreatDetectionService).inSingletonScope();

  // Bind incident response services (Phase 4.1)
  container.bind<IIncidentResponseService>(TYPES.IncidentResponseService).to(IncidentResponseService).inSingletonScope();

  // Bind metrics services (Phase 5.4)
  container.bind<IMetricsService>(TYPES.MetricsService).to(MetricsService).inSingletonScope();

  // Bind AI services (Phase 6.1)
  container.bind<AIAssistantService>(TYPES.AIAssistantService).to(AIAssistantService).inSingletonScope();
  container.bind<AutoModService>(TYPES.AutoModService).to(AutoModService).inSingletonScope();

  // Bind gamification services (Phase 6.2)
  container.bind<GamificationService>(TYPES.GamificationService).to(GamificationService).inSingletonScope();

  // CustomCommandService and ReactionRoleService will be added in Phase 2.4+
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
