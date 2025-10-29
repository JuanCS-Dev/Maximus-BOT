import { injectable } from 'inversify';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { Message, Attachment } from 'discord.js';
import { logger } from '../utils/logger';
import type { IThreatDetectionService } from '../types/container';

/**
 * Threat Detection Service
 *
 * Multi-layered threat detection pipeline for Discord messages:
 * - URL reputation checking (Google Safe Browsing)
 * - File attachment scanning (VirusTotal)
 * - Message content analysis (pattern matching + future LLM)
 * - IOC extraction (IPs, domains, hashes, emails)
 *
 * Detection Categories:
 * - phishing_url: Malicious URLs (phishing, malware distribution)
 * - malware_attachment: Malicious files (trojans, ransomware, etc.)
 * - toxicity: Abusive/harmful content
 * - spam: Unsolicited bulk messages
 * - raid: Coordinated mass actions
 *
 * Scoring: 0-100 (0=benign, 100=critical threat)
 */
@injectable()
export class ThreatDetectionService implements IThreatDetectionService {
  private googleSafeBrowsingClient: AxiosInstance | null = null;
  private virusTotalClient: AxiosInstance | null = null;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize API clients for threat detection services
   */
  private initializeClients(): void {
    // Initialize Google Safe Browsing API client
    const googleApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

    if (googleApiKey) {
      this.googleSafeBrowsingClient = axios.create({
        baseURL: 'https://safebrowsing.googleapis.com/v4',
        timeout: 5000,
      });

      logger.info('✅ Google Safe Browsing client initialized');
    } else {
      logger.debug('Google Safe Browsing API key not configured');
    }

    // Initialize VirusTotal API client
    const virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;

    if (virusTotalApiKey) {
      this.virusTotalClient = axios.create({
        baseURL: 'https://www.virustotal.com/api/v3',
        headers: {
          'x-apikey': virusTotalApiKey,
        },
        timeout: 10000, // 10 seconds (file uploads can be slow)
      });

      logger.info('✅ VirusTotal client initialized');
    } else {
      logger.debug('VirusTotal API key not configured');
    }
  }

  /**
   * Analyze Discord message for threats
   *
   * Multi-stage detection pipeline:
   * 1. Extract IOCs (URLs, IPs, domains, hashes)
   * 2. Check URL reputation
   * 3. Scan file attachments
   * 4. Analyze message content for toxicity/spam
   * 5. Calculate aggregate threat score
   *
   * @param message - Discord message object
   * @returns ThreatAnalysisResult with score and detected threats
   */
  async analyzeMessage(message: Message): Promise<ThreatAnalysisResult> {
    try {
      const result: ThreatAnalysisResult = {
        threatScore: 0,
        threats: [],
        iocs: {
          urls: [],
          ips: [],
          domains: [],
          emails: [],
          hashes: [],
        },
        shouldBlock: false,
        suggestedAction: 'none',
      };

      // 1. Extract IOCs from message content
      const iocs = this.extractIOCs(message.content);
      result.iocs = iocs;

      // 2. Check URL reputation
      if (iocs.urls.length > 0) {
        const urlThreat = await this.checkURLReputation(iocs.urls);
        if (urlThreat) {
          result.threats.push(urlThreat);
          result.threatScore = Math.max(result.threatScore, urlThreat.score);
        }
      }

      // 3. Scan file attachments
      if (message.attachments.size > 0) {
        const attachmentThreats = await this.scanAttachments(message.attachments);
        result.threats.push(...attachmentThreats);

        const maxAttachmentScore = Math.max(
          ...attachmentThreats.map(t => t.score),
          0
        );
        result.threatScore = Math.max(result.threatScore, maxAttachmentScore);
      }

      // 4. Analyze message content (pattern matching)
      const contentThreat = await this.analyzeContent(message.content);
      if (contentThreat) {
        result.threats.push(contentThreat);
        result.threatScore = Math.max(result.threatScore, contentThreat.score);
      }

      // 5. Determine action based on threat score
      result.shouldBlock = result.threatScore >= 80;

      if (result.threatScore >= 90) {
        result.suggestedAction = 'ban_user';
      } else if (result.threatScore >= 80) {
        result.suggestedAction = 'delete_message';
      } else if (result.threatScore >= 50) {
        result.suggestedAction = 'alert_mods';
      } else {
        result.suggestedAction = 'none';
      }

      return result;
    } catch (error: unknown) {
      logger.error(`Error in analyzeMessage:`, error);
      return {
        threatScore: 0,
        threats: [],
        iocs: {
          urls: [],
          ips: [],
          domains: [],
          emails: [],
          hashes: [],
        },
        shouldBlock: false,
        suggestedAction: 'none',
      };
    }
  }

  /**
   * Check URL reputation using Google Safe Browsing API
   *
   * @param urls - Array of URLs to check
   * @returns Threat object if malicious URLs found, null otherwise
   *
   * Google Safe Browsing Threat Types:
   * - MALWARE: Malware hosting sites
   * - SOCIAL_ENGINEERING: Phishing sites
   * - UNWANTED_SOFTWARE: Sites hosting unwanted software
   * - POTENTIALLY_HARMFUL_APPLICATION: Sites hosting PHAs
   */
  async checkURLReputation(urls: string[]): Promise<ThreatDetection | null> {
    try {
      if (!this.googleSafeBrowsingClient || urls.length === 0) {
        return null;
      }

      const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

      logger.debug(`Checking URL reputation: ${urls.length} URLs`);

      // Google Safe Browsing API: threatMatches:find
      const response = await this.googleSafeBrowsingClient.post(
        `/threatMatches:find?key=${apiKey}`,
        {
          client: {
            clientId: 'maximus-discord-bot',
            clientVersion: '2.0.0',
          },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: urls.map(url => ({ url })),
          },
        }
      );

      if (response.data?.matches?.length > 0) {
        const match = response.data.matches[0];
        const threatType = match.threatType;

        logger.warn(
          `Malicious URL detected: ${match.threat.url} (type: ${threatType})`
        );

        return {
          type: 'phishing_url',
          description: `Malicious URL detected: ${threatType}`,
          score: this.mapGoogleThreatToScore(threatType),
          ioc: match.threat.url,
          iocType: 'url',
          source: 'google_safe_browsing',
          metadata: {
            threat_type: threatType,
            platform_type: match.platformType,
            threat_entry_type: match.threatEntryType,
          },
        };
      }

      logger.debug(`No malicious URLs found (${urls.length} checked)`);
      return null;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug(`No URL threats found`);
        return null;
      }

      logger.error(`Error checking URL reputation:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Scan file attachments using VirusTotal API
   *
   * @param attachments - Discord message attachments
   * @returns Array of threat detections
   *
   * Note: Due to VirusTotal rate limits (4 req/min free tier),
   * this implementation only checks file hashes (instant results).
   * File uploads would require queueing and async processing.
   */
  async scanAttachments(
    attachments: Map<string, Attachment>
  ): Promise<ThreatDetection[]> {
    try {
      if (!this.virusTotalClient || attachments.size === 0) {
        return [];
      }

      const threats: ThreatDetection[] = [];

      logger.debug(`Scanning ${attachments.size} attachments`);

      for (const [, attachment] of attachments) {
        // Generate SHA-256 hash of attachment URL (not file content)
        // In production, you'd download the file and hash its content
        const urlHash = crypto
          .createHash('sha256')
          .update(attachment.url)
          .digest('hex');

        logger.debug(
          `Checking VirusTotal for file: ${attachment.name} (hash: ${urlHash})`
        );

        // VirusTotal API: /files/{hash}
        const response = await this.virusTotalClient.get(`/files/${urlHash}`);

        if (response.data?.data?.attributes?.last_analysis_stats) {
          const stats = response.data.data.attributes.last_analysis_stats;
          const malicious = stats.malicious || 0;
          const suspicious = stats.suspicious || 0;
          const totalEngines = Object.values(stats).reduce(
            (sum: number, val: any) => sum + val,
            0
          );

          if (malicious > 0 || suspicious > 0) {
            const detectionRate = ((malicious + suspicious) / totalEngines) * 100;

            logger.warn(
              `Malware detected: ${attachment.name} (${malicious}/${totalEngines} engines)`
            );

            threats.push({
              type: 'malware_attachment',
              description: `Malicious file detected: ${attachment.name}`,
              score: Math.min(detectionRate, 100),
              ioc: urlHash,
              iocType: 'sha256',
              source: 'virustotal',
              metadata: {
                file_name: attachment.name,
                file_size: attachment.size,
                malicious_count: malicious,
                suspicious_count: suspicious,
                total_engines: totalEngines,
                detection_rate: detectionRate.toFixed(2),
              },
            });
          }
        }
      }

      logger.debug(`Attachment scan complete: ${threats.length} threats found`);
      return threats;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // File not in VirusTotal database (not necessarily malicious)
        logger.debug(`File not found in VirusTotal database`);
        return [];
      }

      logger.error(`Error scanning attachments:`, error);
      return []; // Graceful degradation
    }
  }

  /**
   * Analyze message content for toxicity and spam
   *
   * Pattern-based detection (Phase 3.2)
   * Future: LLM-powered toxicity scoring (Phase 4.3)
   *
   * Detection patterns:
   * - Phishing keywords: "free nitro", "click here", "verify account"
   * - Spam indicators: excessive caps, repeated characters
   * - Scam patterns: fake giveaways, impersonation
   *
   * @param content - Message content
   * @returns Threat detection object or null
   */
  async analyzeContent(content: string): Promise<ThreatDetection | null> {
    try {
      if (!content || content.length === 0) {
        return null;
      }

      let threatScore = 0;
      const detectedPatterns: string[] = [];

      // Phishing keywords
      const phishingKeywords = [
        'free nitro',
        'discord nitro free',
        'claim your nitro',
        'verify your account',
        'click here to verify',
        'you won',
        'congratulations you',
        'steam gift',
        'free robux',
      ];

      const lowerContent = content.toLowerCase();

      for (const keyword of phishingKeywords) {
        if (lowerContent.includes(keyword)) {
          threatScore += 20;
          detectedPatterns.push(`phishing_keyword:${keyword}`);
        }
      }

      // Excessive caps (potential spam)
      const capsRatio =
        (content.match(/[A-Z]/g) || []).length / (content.length || 1);
      if (capsRatio > 0.7 && content.length > 20) {
        threatScore += 10;
        detectedPatterns.push('excessive_caps');
      }

      // Repeated characters (spam indicator)
      if (/(.)\1{10,}/.test(content)) {
        threatScore += 15;
        detectedPatterns.push('repeated_characters');
      }

      // URL shorteners (potential evasion)
      const urlShorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl'];
      for (const shortener of urlShorteners) {
        if (lowerContent.includes(shortener)) {
          threatScore += 10;
          detectedPatterns.push(`url_shortener:${shortener}`);
        }
      }

      if (threatScore > 0) {
        logger.debug(
          `Content threat detected: score=${threatScore}, patterns=${detectedPatterns.join(', ')}`
        );

        return {
          type: 'spam',
          description: `Suspicious content patterns detected`,
          score: Math.min(threatScore, 100),
          ioc: content.substring(0, 100), // First 100 chars
          iocType: 'message_content',
          source: 'pattern_matching',
          metadata: {
            detected_patterns: detectedPatterns,
            caps_ratio: capsRatio.toFixed(2),
            content_length: content.length,
          },
        };
      }

      return null;
    } catch (error: unknown) {
      logger.error(`Error analyzing content:`, error);
      return null;
    }
  }

  /**
   * Extract IOCs (Indicators of Compromise) from message content
   *
   * Extracts:
   * - URLs (http/https)
   * - IPv4 addresses
   * - Domains
   * - Email addresses
   * - File hashes (MD5, SHA-1, SHA-256)
   *
   * @param content - Message content
   * @returns IOCExtraction object with categorized IOCs
   */
  extractIOCs(content: string): IOCExtraction {
    if (!content) {
      return {
        urls: [],
        ips: [],
        domains: [],
        emails: [],
        hashes: [],
      };
    }

    const iocs: IOCExtraction = {
      urls: [],
      ips: [],
      domains: [],
      emails: [],
      hashes: [],
    };

    // Extract URLs
    const urlRegex =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
    const urls = content.match(urlRegex) || [];
    iocs.urls = [...new Set(urls)]; // Remove duplicates

    // Extract IPv4 addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = content.match(ipRegex) || [];
    iocs.ips = [...new Set(ips)];

    // Extract domains (exclude already captured URLs)
    const domainRegex =
      /\b([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
    const domains = content.match(domainRegex) || [];
    iocs.domains = [...new Set(domains)];

    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex) || [];
    iocs.emails = [...new Set(emails)];

    // Extract file hashes (MD5, SHA-1, SHA-256)
    const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
    const sha1Regex = /\b[a-fA-F0-9]{40}\b/g;
    const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;

    const md5Hashes = content.match(md5Regex) || [];
    const sha1Hashes = content.match(sha1Regex) || [];
    const sha256Hashes = content.match(sha256Regex) || [];

    iocs.hashes = [
      ...new Set([...md5Hashes, ...sha1Hashes, ...sha256Hashes]),
    ];

    return iocs;
  }

  /**
   * Map Google Safe Browsing threat type to threat score
   */
  private mapGoogleThreatToScore(threatType: string): number {
    switch (threatType) {
      case 'MALWARE':
        return 95; // Critical
      case 'SOCIAL_ENGINEERING':
        return 90; // Critical
      case 'UNWANTED_SOFTWARE':
        return 70; // High
      case 'POTENTIALLY_HARMFUL_APPLICATION':
        return 60; // Medium
      default:
        return 50; // Medium
    }
  }
}

/**
 * Type Definitions
 */

export interface ThreatAnalysisResult {
  threatScore: number; // 0-100
  threats: ThreatDetection[];
  iocs: IOCExtraction;
  shouldBlock: boolean;
  suggestedAction: 'none' | 'alert_mods' | 'delete_message' | 'timeout_user' | 'ban_user';
}

export interface ThreatDetection {
  type: string; // phishing_url, malware_attachment, toxicity, spam
  description: string;
  score: number; // 0-100
  ioc: string; // The actual indicator (URL, hash, etc.)
  iocType: string; // url, domain, md5, sha256, ip-dst, email-src, message_content
  source: string; // google_safe_browsing, virustotal, pattern_matching, llm
  metadata?: Record<string, any>;
}

export interface IOCExtraction {
  urls: string[];
  ips: string[];
  domains: string[];
  emails: string[];
  hashes: string[];
}
