import { injectable } from 'inversify';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { logger } from '../utils/logger';
import type { IMetricsService } from '../types/container';

/**
 * Metrics Service
 *
 * Prometheus-compatible metrics exporter for observability.
 * Exposes /metrics endpoint for Grafana/Prometheus scraping.
 *
 * Metric Types:
 * - Counter: Cumulative values (requests, errors)
 * - Gauge: Point-in-time values (guilds, users, memory)
 * - Histogram: Distribution of values (response times, scores)
 *
 * Metrics Categories:
 * - Bot Health: uptime, memory, CPU
 * - Discord Stats: guilds, users, channels, messages
 * - Security: threat detections, alerts, incidents
 * - Commands: execution count, errors
 * - API: external API calls, latencies
 */
@injectable()
export class MetricsService implements IMetricsService {
  private registry: Registry;

  // Bot Health Metrics
  private uptimeGauge: Gauge;
  private memoryUsageGauge: Gauge;

  // Discord Stats Metrics
  private guildsGauge: Gauge;
  private usersGauge: Gauge;
  private channelsGauge: Gauge;
  private messagesCounter: Counter;

  // Security Metrics
  private threatDetectionsCounter: Counter;
  private threatScoreHistogram: Histogram;
  private alertsCounter: Counter;
  private incidentsCounter: Counter;

  // Command Metrics
  private commandExecutionsCounter: Counter;
  private commandErrorsCounter: Counter;
  private commandDurationHistogram: Histogram;

  // API Metrics
  private apiCallsCounter: Counter;
  private apiErrorsCounter: Counter;
  private apiDurationHistogram: Histogram;

  constructor() {
    // Create registry
    this.registry = new Registry();

    // Enable default metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({ register: this.registry });

    // Initialize custom metrics
    this.uptimeGauge = new Gauge({
      name: 'maximus_bot_uptime_seconds',
      help: 'Bot uptime in seconds',
      registers: [this.registry],
    });

    this.memoryUsageGauge = new Gauge({
      name: 'maximus_bot_memory_usage_bytes',
      help: 'Bot memory usage in bytes',
      labelNames: ['type'], // heap_used, heap_total, rss
      registers: [this.registry],
    });

    this.guildsGauge = new Gauge({
      name: 'maximus_discord_guilds_total',
      help: 'Total number of guilds',
      registers: [this.registry],
    });

    this.usersGauge = new Gauge({
      name: 'maximus_discord_users_total',
      help: 'Total number of users',
      registers: [this.registry],
    });

    this.channelsGauge = new Gauge({
      name: 'maximus_discord_channels_total',
      help: 'Total number of channels',
      registers: [this.registry],
    });

    this.messagesCounter = new Counter({
      name: 'maximus_discord_messages_total',
      help: 'Total number of messages processed',
      labelNames: ['guild_id'],
      registers: [this.registry],
    });

    this.threatDetectionsCounter = new Counter({
      name: 'maximus_security_threat_detections_total',
      help: 'Total number of threat detections',
      labelNames: ['type', 'severity'], // type: phishing, malware, etc. severity: low, medium, high, critical
      registers: [this.registry],
    });

    this.threatScoreHistogram = new Histogram({
      name: 'maximus_security_threat_score',
      help: 'Distribution of threat scores',
      labelNames: ['type'],
      buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      registers: [this.registry],
    });

    this.alertsCounter = new Counter({
      name: 'maximus_security_alerts_total',
      help: 'Total number of security alerts sent',
      labelNames: ['severity'],
      registers: [this.registry],
    });

    this.incidentsCounter = new Counter({
      name: 'maximus_security_incidents_total',
      help: 'Total number of incident cases created',
      labelNames: ['type', 'severity'],
      registers: [this.registry],
    });

    this.commandExecutionsCounter = new Counter({
      name: 'maximus_commands_executions_total',
      help: 'Total number of command executions',
      labelNames: ['command', 'guild_id'],
      registers: [this.registry],
    });

    this.commandErrorsCounter = new Counter({
      name: 'maximus_commands_errors_total',
      help: 'Total number of command errors',
      labelNames: ['command', 'error_type'],
      registers: [this.registry],
    });

    this.commandDurationHistogram = new Histogram({
      name: 'maximus_commands_duration_seconds',
      help: 'Command execution duration in seconds',
      labelNames: ['command'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.apiCallsCounter = new Counter({
      name: 'maximus_api_calls_total',
      help: 'Total number of external API calls',
      labelNames: ['api', 'method', 'status'], // api: misp, opencti, virustotal, etc.
      registers: [this.registry],
    });

    this.apiErrorsCounter = new Counter({
      name: 'maximus_api_errors_total',
      help: 'Total number of external API errors',
      labelNames: ['api', 'error_type'],
      registers: [this.registry],
    });

    this.apiDurationHistogram = new Histogram({
      name: 'maximus_api_duration_seconds',
      help: 'External API call duration in seconds',
      labelNames: ['api', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    logger.info('✅ Metrics service initialized');
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Update bot health metrics
   */
  updateBotHealth(uptime: number, memoryUsage: NodeJS.MemoryUsage): void {
    this.uptimeGauge.set(uptime / 1000); // Convert to seconds

    this.memoryUsageGauge.set({ type: 'heap_used' }, memoryUsage.heapUsed);
    this.memoryUsageGauge.set({ type: 'heap_total' }, memoryUsage.heapTotal);
    this.memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);
  }

  /**
   * Update Discord statistics
   */
  updateDiscordStats(guilds: number, users: number, channels: number): void {
    this.guildsGauge.set(guilds);
    this.usersGauge.set(users);
    this.channelsGauge.set(channels);
  }

  /**
   * Record message processed
   */
  recordMessage(guildId: string): void {
    this.messagesCounter.inc({ guild_id: guildId });
  }

  /**
   * Record threat detection
   */
  recordThreatDetection(type: string, score: number): void {
    const severity = this.calculateSeverity(score);
    this.threatDetectionsCounter.inc({ type, severity });
    this.threatScoreHistogram.observe({ type }, score);
  }

  /**
   * Record security alert
   */
  recordAlert(severity: string): void {
    this.alertsCounter.inc({ severity });
  }

  /**
   * Record incident case
   */
  recordIncident(type: string, severity: string): void {
    this.incidentsCounter.inc({ type, severity });
  }

  /**
   * Record command execution
   */
  recordCommandExecution(command: string, guildId: string, duration: number): void {
    this.commandExecutionsCounter.inc({ command, guild_id: guildId });
    this.commandDurationHistogram.observe({ command }, duration);
  }

  /**
   * Record command error
   */
  recordCommandError(command: string, errorType: string): void {
    this.commandErrorsCounter.inc({ command, error_type: errorType });
  }

  /**
   * Record API call
   */
  recordAPICall(api: string, method: string, status: string, duration: number): void {
    this.apiCallsCounter.inc({ api, method, status });
    this.apiDurationHistogram.observe({ api, method }, duration);
  }

  /**
   * Record API error
   */
  recordAPIError(api: string, errorType: string): void {
    this.apiErrorsCounter.inc({ api, error_type: errorType });
  }

  /**
   * Calculate severity from score
   */
  private calculateSeverity(score: number): string {
    if (score >= 90) return 'critical';
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}
