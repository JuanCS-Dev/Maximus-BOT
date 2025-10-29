import { injectable } from 'inversify';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import type { IThreatIntelligenceService } from '../types/container';

/**
 * Threat Intelligence Service
 *
 * Bidirectional integration with threat intelligence platforms:
 * - MISP (Malware Information Sharing Platform)
 * - OpenCTI (Open Cyber Threat Intelligence)
 * - Vértice-MAXIMUS ecosystem
 *
 * Features:
 * - Query IOCs (Indicators of Compromise): IPs, domains, hashes, emails
 * - Report sightings back to TIPs (IOC seen "in the wild")
 * - Create new events for novel threats discovered on Discord
 * - Enrich alerts with APT attribution and campaign data
 * - Cross-platform threat correlation
 *
 * Standards: STIX 2.1, TAXII 2.1, MISP Core Format
 */
@injectable()
export class ThreatIntelligenceService implements IThreatIntelligenceService {
  private mispClient: AxiosInstance | null = null;
  private openCTIClient: AxiosInstance | null = null;
  private verticeClient: AxiosInstance | null = null;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize API clients for MISP, OpenCTI, and Vértice-MAXIMUS
   */
  private initializeClients(): void {
    // Initialize MISP client
    const mispEnabled = process.env.MISP_ENABLED === 'true';
    const mispUrl = process.env.MISP_URL;
    const mispApiKey = process.env.MISP_API_KEY;

    if (mispEnabled && mispUrl && mispApiKey) {
      this.mispClient = axios.create({
        baseURL: mispUrl,
        headers: {
          'Authorization': mispApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });

      logger.info('✅ MISP client initialized');
    } else {
      logger.debug('MISP integration disabled or not configured');
    }

    // Initialize OpenCTI client
    const openctiEnabled = process.env.OPENCTI_ENABLED === 'true';
    const openctiUrl = process.env.OPENCTI_URL;
    const openctiApiKey = process.env.OPENCTI_API_KEY;

    if (openctiEnabled && openctiUrl && openctiApiKey) {
      this.openCTIClient = axios.create({
        baseURL: openctiUrl,
        headers: {
          'Authorization': `Bearer ${openctiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      logger.info('✅ OpenCTI client initialized');
    } else {
      logger.debug('OpenCTI integration disabled or not configured');
    }

    // Initialize Vértice-MAXIMUS client
    const verticeEnabled = process.env.VERTICE_MAXIMUS_ENABLED === 'true';
    const verticeUrl = process.env.VERTICE_MAXIMUS_API_URL;
    const verticeApiKey = process.env.VERTICE_API_KEY;

    if (verticeEnabled && verticeUrl && verticeApiKey) {
      this.verticeClient = axios.create({
        baseURL: verticeUrl,
        headers: {
          'Authorization': `Bearer ${verticeApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      logger.info('✅ Vértice-MAXIMUS client initialized');
    } else {
      logger.debug('Vértice-MAXIMUS integration disabled or not configured');
    }
  }

  /**
   * Query MISP for information about an IOC
   *
   * @param ioc - Indicator of Compromise (IP, domain, hash, email)
   * @param iocType - Type of IOC (ip-dst, domain, md5, sha256, email-src)
   * @returns MISP Event data with context, or null if not found
   *
   * @example
   * ```typescript
   * const event = await threatIntelService.queryMISP('malicious.com', 'domain');
   * if (event) {
   *   console.log(`Threat found: ${event.info}`);
   *   console.log(`Related to APT: ${event.tags}`);
   * }
   * ```
   */
  async queryMISP(ioc: string, iocType: string): Promise<MISPEvent | null> {
    try {
      if (!this.mispClient) {
        logger.debug('MISP client not initialized');
        return null;
      }

      logger.debug(`Querying MISP for IOC: ${ioc} (type: ${iocType})`);

      // MISP REST API: /attributes/restSearch
      const response = await this.mispClient.post('/attributes/restSearch', {
        returnFormat: 'json',
        value: ioc,
        type: iocType,
        limit: 1,
        published: true, // Only return published events
      });

      if (response.data?.response?.Attribute?.length > 0) {
        const attribute = response.data.response.Attribute[0];
        const eventId = attribute.event_id;

        // Fetch full event details
        const eventResponse = await this.mispClient.get(`/events/view/${eventId}`);
        const event = eventResponse.data.Event;

        logger.info(`MISP match found: Event ${eventId} - ${event.info}`);

        return {
          id: event.id,
          info: event.info,
          threat_level_id: event.threat_level_id,
          analysis: event.analysis,
          tags: event.Tag?.map((t: any) => t.name) || [],
          date: event.date,
          orgName: event.Orgc?.name || 'Unknown',
          galaxies: event.Galaxy?.map((g: any) => g.name) || [],
          attributes: event.Attribute?.length || 0,
        };
      }

      logger.debug(`No MISP match found for IOC: ${ioc}`);
      return null;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug(`IOC not found in MISP: ${ioc}`);
        return null;
      }

      logger.error(`Error querying MISP:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Report sighting to MISP (IOC seen "in the wild" on Discord)
   *
   * @param ioc - Indicator of Compromise
   * @param guildId - Discord guild where IOC was seen
   * @returns True if sighting reported successfully
   *
   * Purpose: Contributes to community threat intelligence by reporting
   * that a known threat was observed on Discord.
   */
  async reportSighting(ioc: string, guildId: string): Promise<boolean> {
    try {
      if (!this.mispClient) {
        logger.debug('MISP client not initialized');
        return false;
      }

      logger.debug(`Reporting sighting to MISP: ${ioc} (guild: ${guildId})`);

      // MISP REST API: /sightings/add
      await this.mispClient.post('/sightings/add', {
        value: ioc,
        source: 'MAXIMUS Discord Bot',
        type: '0', // Sighting (not false positive)
        metadata: {
          discord_guild_id: guildId,
          platform: 'discord',
          bot_version: '2.0.0',
        },
      });

      logger.info(`Sighting reported to MISP: ${ioc}`);
      return true;
    } catch (error: unknown) {
      logger.error(`Error reporting sighting to MISP:`, error);
      return false;
    }
  }

  /**
   * Create new MISP event for novel threat discovered on Discord
   *
   * @param threat - Threat data from Discord
   * @param guildId - Discord guild where threat was discovered
   * @returns MISP Event object if created, null otherwise
   *
   * Purpose: Share new threats discovered on Discord with the security community.
   * Only use for high-confidence novel threats (not already in MISP).
   */
  async createMISPEvent(threat: ThreatData, guildId: string): Promise<MISPEvent | null> {
    try {
      if (!this.mispClient) {
        logger.debug('MISP client not initialized');
        return null;
      }

      logger.info(`Creating MISP event for threat: ${threat.type} (guild: ${guildId})`);

      // MISP REST API: /events/add
      const response = await this.mispClient.post('/events/add', {
        Event: {
          info: `Discord Threat: ${threat.type} - ${threat.description}`,
          threat_level_id: this.mapThreatScoreToLevel(threat.score),
          analysis: '0', // Initial (0=initial, 1=ongoing, 2=complete)
          distribution: '3', // All communities
          published: false, // Requires manual review before publishing
          Tag: [
            { name: 'tlp:white' },
            { name: 'source:discord' },
            { name: 'type:OSINT' },
            { name: `threat-type:${threat.type}` },
          ],
          Attribute: [
            {
              type: threat.iocType,
              value: threat.ioc,
              category: 'Network activity',
              comment: `Observed on Discord guild ${guildId}`,
              to_ids: true, // Enable IDS signature
            },
          ],
          Galaxy: [],
        },
      });

      const event = response.data.Event;

      logger.info(`MISP event created: ${event.id} - ${event.info}`);

      return {
        id: event.id,
        info: event.info,
        threat_level_id: event.threat_level_id,
        analysis: event.analysis,
        tags: event.Tag?.map((t: any) => t.name) || [],
        date: event.date,
        orgName: event.Orgc?.name || 'MAXIMUS',
        galaxies: [],
        attributes: 1,
      };
    } catch (error: unknown) {
      logger.error(`Error creating MISP event:`, error);
      return null;
    }
  }

  /**
   * Query OpenCTI for threat actor/campaign data
   *
   * @param indicator - Indicator value (domain, IP, hash)
   * @returns OpenCTI Indicator object with enrichment data
   *
   * Purpose: Enrich Discord alerts with APT attribution, campaign info,
   * and structured threat intelligence from OpenCTI's knowledge graph.
   */
  async queryOpenCTI(indicator: string): Promise<OpenCTIIndicator | null> {
    try {
      if (!this.openCTIClient) {
        logger.debug('OpenCTI client not initialized');
        return null;
      }

      logger.debug(`Querying OpenCTI for indicator: ${indicator}`);

      // OpenCTI GraphQL query
      const query = `
        query GetIndicatorByValue($value: String!) {
          indicators(filters: { key: "value", values: [$value] }) {
            edges {
              node {
                id
                name
                pattern
                description
                created_by_ref {
                  name
                }
                labels
                objectMarking {
                  definition
                }
                observables {
                  edges {
                    node {
                      observable_value
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.openCTIClient.post('/graphql', {
        query,
        variables: { value: indicator },
      });

      if (response.data?.data?.indicators?.edges?.length > 0) {
        const node = response.data.data.indicators.edges[0].node;

        logger.info(`OpenCTI match found: ${node.name}`);

        return {
          id: node.id,
          name: node.name,
          pattern: node.pattern,
          description: node.description,
          createdBy: node.created_by_ref?.name || 'Unknown',
          labels: node.labels || [],
          marking: node.objectMarking?.map((m: any) => m.definition) || [],
        };
      }

      logger.debug(`No OpenCTI match found for indicator: ${indicator}`);
      return null;
    } catch (error: unknown) {
      logger.error(`Error querying OpenCTI:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Forward threat to Vértice-MAXIMUS ecosystem for cross-platform analysis
   *
   * @param threat - Threat data from Discord
   * @returns True if forwarded successfully
   *
   * Purpose: Share threats across Vértice-MAXIMUS 9-layer immune system
   * for ecosystem-wide threat correlation and LLM-powered narrative generation.
   */
  async forwardToVerticeMaximus(threat: ThreatData): Promise<boolean> {
    try {
      if (!this.verticeClient) {
        logger.debug('Vértice-MAXIMUS client not initialized');
        return false;
      }

      logger.info(`Forwarding threat to Vértice-MAXIMUS: ${threat.type}`);

      // Vértice-MAXIMUS REST API: /api/threats/ingest
      await this.verticeClient.post('/threats/ingest', {
        source: 'discord',
        guild_id: threat.guildId,
        threat_type: threat.type,
        ioc: threat.ioc,
        ioc_type: threat.iocType,
        threat_score: threat.score,
        timestamp: new Date().toISOString(),
        context: {
          user_id: threat.userId,
          message_id: threat.messageId,
          message_content: '[REDACTED]', // Don't send message content
          attachment_hashes: threat.attachmentHashes || [],
        },
        metadata: {
          bot_version: '2.0.0',
          detection_method: threat.detectionMethod || 'automated',
        },
      });

      logger.info(`Threat forwarded to Vértice-MAXIMUS successfully`);
      return true;
    } catch (error: unknown) {
      logger.error(`Error forwarding to Vértice-MAXIMUS:`, error);
      return false;
    }
  }

  /**
   * Map threat score (0-100) to MISP threat level (1-4)
   *
   * MISP Threat Levels:
   * 1 = High (critical threats)
   * 2 = Medium
   * 3 = Low
   * 4 = Undefined
   */
  private mapThreatScoreToLevel(score: number): string {
    if (score >= 80) return '1'; // High
    if (score >= 50) return '2'; // Medium
    if (score >= 20) return '3'; // Low
    return '4'; // Undefined
  }
}

/**
 * Type Definitions
 */

export interface MISPEvent {
  id: string;
  info: string; // Event description
  threat_level_id: string; // 1=High, 2=Medium, 3=Low, 4=Undefined
  analysis: string; // 0=Initial, 1=Ongoing, 2=Complete
  tags: string[]; // Tags like 'tlp:white', 'apt28', 'phishing'
  date: string;
  orgName: string; // Organization that created the event
  galaxies: string[]; // MISP galaxies (APT groups, malware families)
  attributes: number; // Number of attributes (IOCs)
}

export interface OpenCTIIndicator {
  id: string;
  name: string;
  pattern: string; // STIX pattern
  description: string;
  createdBy: string;
  labels: string[];
  marking: string[]; // TLP marking (TLP:WHITE, TLP:AMBER, etc.)
}

export interface ThreatData {
  type: string; // phishing_url, malware_attachment, toxicity, raid
  description: string;
  score: number; // 0-100
  ioc: string; // The actual indicator (URL, hash, IP)
  iocType: string; // MISP type (domain, md5, sha256, ip-dst, etc.)
  guildId: string;
  userId?: string;
  messageId?: string;
  attachmentHashes?: string[];
  detectionMethod?: string;
}
