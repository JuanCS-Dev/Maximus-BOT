import { injectable } from 'inversify';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { prisma } from '../database/client';
import { CircuitBreaker, RateLimiter, resilient, retry } from '../utils/resilience';

/**
 * AIAssistantService - AI-Powered Assistant using Claude
 *
 * Phase 6.1.1: AI Revolution
 *
 * Features:
 * - Context-aware moderation (understands sarcasm, nuance)
 * - Phishing email analysis
 * - Security Q&A chatbot
 * - Incident report summarization
 * - Code review assistant
 *
 * Model: Claude 3.5 Sonnet (latest)
 * API: Anthropic API (@anthropic-ai/sdk)
 */

export interface PhishingAnalysisResult {
  isPhishing: boolean;
  confidence: number; // 0-100
  reasoning: string;
  indicators: string[];
  recommendation: 'block' | 'warn' | 'allow';
}

export interface ToxicityAnalysisResult {
  isToxic: boolean;
  score: number; // 0-100
  categories: {
    hate: number;
    harassment: number;
    selfHarm: number;
    sexual: number;
    violence: number;
  };
  reasoning: string;
  suggestedAction: 'delete' | 'warn' | 'ignore';
}

export interface SecurityQueryResponse {
  answer: string;
  confidence: number;
  sources: string[];
  relatedTopics: string[];
}

@injectable()
export class AIAssistantService {
  private client: Anthropic | undefined;
  private model = 'claude-3-5-sonnet-20241022';
  private maxTokens = 2048;

  // Resilience patterns
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor() {
    // Initialize circuit breaker for Anthropic API
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5, // Open after 5 failures
      successThreshold: 2, // Close after 2 successes
      timeout: 60000, // 1 minute timeout
      name: 'anthropic-api',
    });

    // Rate limiter: Anthropic Tier 1 = 50 req/min
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 50,
      interval: 60000, // 1 minute
      maxTokens: 50,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set - AI features will be disabled');
      return;
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    logger.info('AIAssistantService initialized with Claude 3.5 Sonnet', {
      circuitBreaker: 'enabled',
      rateLimit: '50 req/min',
    });
  }

  /**
   * Analyze message for phishing indicators using AI
   * Replaces pattern-based detection with contextual understanding
   */
  async analyzePhishingMessage(content: string, metadata?: {
    authorId?: string;
    channelId?: string;
    hasAttachments?: boolean;
    urls?: string[];
  }): Promise<PhishingAnalysisResult> {
    if (!this.client) {
      throw new Error('AI Assistant not initialized (missing API key)');
    }

    try {
      const systemPrompt = `You are an expert cybersecurity analyst specializing in phishing detection.
Analyze messages for phishing indicators including:
- Urgency/fear tactics
- Suspicious links
- Impersonation attempts
- Request for credentials/payment
- Grammar/spelling issues
- Too-good-to-be-true offers
- Mismatched sender information

Respond ONLY with valid JSON in this exact format:
{
  "isPhishing": boolean,
  "confidence": number (0-100),
  "reasoning": "brief explanation",
  "indicators": ["indicator1", "indicator2"],
  "recommendation": "block" | "warn" | "allow"
}`;

      const contextInfo = metadata ? `
Message metadata:
- Has attachments: ${metadata.hasAttachments || false}
- URLs found: ${metadata.urls?.join(', ') || 'none'}
- Context: Discord message
` : '';

      // Acquire rate limit token
      await this.rateLimiter.acquire();

      // Make API call with retry + circuit breaker
      const response = await resilient(
        () =>
          this.client!.messages.create({
            model: this.model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: `Analyze this message for phishing:\n\n${contextInfo}\nMessage content:\n"${content}"`,
              },
            ],
          }),
        {
          breaker: this.circuitBreaker,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            retryableErrors: ['rate_limit', 'overloaded', 'timeout'],
          },
          timeout: 30000, // 30s timeout
        }
      );

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(resultText) as PhishingAnalysisResult;

      logger.debug('Phishing analysis complete', {
        isPhishing: result.isPhishing,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing phishing with AI:', error);
      // Fallback to non-phishing if AI fails
      return {
        isPhishing: false,
        confidence: 0,
        reasoning: 'AI analysis failed',
        indicators: [],
        recommendation: 'allow',
      };
    }
  }

  /**
   * Analyze content for toxicity, hate speech, harassment
   * More nuanced than pattern matching - understands context
   */
  async analyzeToxicity(content: string, context?: {
    authorUsername?: string;
    channelName?: string;
    replyTo?: string;
  }): Promise<ToxicityAnalysisResult> {
    if (!this.client) {
      throw new Error('AI Assistant not initialized (missing API key)');
    }

    try {
      const systemPrompt = `You are a content moderation AI specializing in detecting toxic behavior.
Analyze messages for:
- Hate speech (racism, sexism, homophobia, etc.)
- Harassment/bullying
- Self-harm ideation
- Sexual content
- Violence/threats

Consider context, sarcasm, and cultural nuances. Respond ONLY with valid JSON:
{
  "isToxic": boolean,
  "score": number (0-100),
  "categories": {
    "hate": number (0-100),
    "harassment": number (0-100),
    "selfHarm": number (0-100),
    "sexual": number (0-100),
    "violence": number (0-100)
  },
  "reasoning": "brief explanation",
  "suggestedAction": "delete" | "warn" | "ignore"
}`;

      const contextInfo = context ? `
Context:
- Author: ${context.authorUsername || 'unknown'}
- Channel: ${context.channelName || 'unknown'}
- Reply to: ${context.replyTo || 'none'}
` : '';

      // Acquire rate limit token
      await this.rateLimiter.acquire();

      // Make API call with resilience patterns
      const response = await resilient(
        () =>
          this.client!.messages.create({
            model: this.model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: `Analyze this message for toxicity:\n\n${contextInfo}\nMessage:\n"${content}"`,
              },
            ],
          }),
        {
          breaker: this.circuitBreaker,
          retry: {
            maxAttempts: 3,
            initialDelay: 1000,
            retryableErrors: ['rate_limit', 'overloaded', 'timeout'],
          },
          timeout: 30000,
        }
      );

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(resultText) as ToxicityAnalysisResult;

      logger.debug('Toxicity analysis complete', {
        isToxic: result.isToxic,
        score: result.score,
      });

      return result;
    } catch (error) {
      logger.error('Error analyzing toxicity with AI:', error);
      return {
        isToxic: false,
        score: 0,
        categories: {
          hate: 0,
          harassment: 0,
          selfHarm: 0,
          sexual: 0,
          violence: 0,
        },
        reasoning: 'AI analysis failed',
        suggestedAction: 'ignore',
      };
    }
  }

  /**
   * Security knowledge chatbot - Answer security questions
   * Uses conversation history for context
   */
  async answerSecurityQuestion(
    question: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<SecurityQueryResponse> {
    if (!this.client) {
      throw new Error('AI Assistant not initialized (missing API key)');
    }

    try {
      const systemPrompt = `You are a cybersecurity expert assistant for the Vértice Discord Bot.
Help users understand security concepts, threat intelligence, incident response procedures, and best practices.

Provide accurate, technical information while being accessible to non-experts.
If you don't know something, say so - don't make up information.

Always respond in JSON format:
{
  "answer": "detailed answer",
  "confidence": number (0-100),
  "sources": ["source1", "source2"],
  "relatedTopics": ["topic1", "topic2"]
}`;

      const messages: Anthropic.MessageParam[] = [];

      // Add conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        messages.push(
          ...conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        );
      }

      // Add current question
      messages.push({
        role: 'user',
        content: question,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages,
      });

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(resultText) as SecurityQueryResponse;

      logger.info('Security question answered', {
        question: question.substring(0, 50),
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Error answering security question:', error);
      return {
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
        confidence: 0,
        sources: [],
        relatedTopics: [],
      };
    }
  }

  /**
   * Summarize incident for reporting
   * Generates executive summary from incident data
   */
  async summarizeIncident(incidentId: string): Promise<{
    summary: string;
    keyFindings: string[];
    timeline: string;
    recommendation: string;
  }> {
    if (!this.client) {
      throw new Error('AI Assistant not initialized (missing API key)');
    }

    try {
      // Fetch incident from database
      const incident = await prisma.incidentCase.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Fetch related threat detections
      const threats = await prisma.threatDetection.findMany({
        where: {
          guildId: incident.guildId,
          createdAt: {
            gte: incident.createdAt,
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const systemPrompt = `You are a security analyst writing incident reports.
Create a concise, technical summary suitable for stakeholders.
Include key findings, timeline, and recommendations.

Respond in JSON format:
{
  "summary": "executive summary (2-3 sentences)",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "timeline": "chronological summary",
  "recommendation": "recommended actions"
}`;

      const incidentData = {
        id: incident.id,
        type: incident.incidentType,
        severity: incident.severity,
        status: incident.status,
        createdAt: incident.createdAt,
        timeline: incident.timeline,
        threatCount: threats.length,
        threats: threats.map((t: any) => ({
          type: t.threatType,
          score: t.threatScore,
          ioc: t.ioc,
          time: t.createdAt,
        })),
      };

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Summarize this security incident:\n\n${JSON.stringify(incidentData, null, 2)}`,
          },
        ],
      });

      const resultText = response.content[0].type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(resultText);

      logger.info('Incident summarized', { incidentId });

      return result;
    } catch (error) {
      logger.error('Error summarizing incident:', error);
      return {
        summary: 'Error generating summary',
        keyFindings: [],
        timeline: '',
        recommendation: '',
      };
    }
  }

  /**
   * Explain threat intelligence term/concept
   * Educational assistant for security team
   */
  async explainTerm(term: string): Promise<string> {
    if (!this.client) {
      throw new Error('AI Assistant not initialized (missing API key)');
    }

    try {
      const systemPrompt = `You are a cybersecurity educator.
Explain security terms clearly and concisely.
Include: definition, context, real-world examples, and related terms.
Keep explanations under 500 words.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Explain the security term: "${term}"`,
          },
        ],
      });

      const explanation = response.content[0].type === 'text' ? response.content[0].text : '';

      logger.debug('Term explained', { term });

      return explanation;
    } catch (error) {
      logger.error('Error explaining term:', error);
      return 'Sorry, I could not explain this term. Please try again.';
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.client !== undefined;
  }
}
