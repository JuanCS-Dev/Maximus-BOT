/**
 * Resilience Utilities - Enterprise-grade error handling
 *
 * Features:
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Rate limiting with token bucket
 * - Graceful degradation helpers
 *
 * Constitutional Compliance:
 * - Article VII (Antifragility): Circuit breaker prevents cascade failures
 * - Article IX (Zero Trust): Rate limiting enforces security boundaries
 * - P6 (Token Efficiency): Exponential backoff prevents wasteful retries
 *
 * @author Claude Code (Sonnet 4.5)
 * @date 2025-10-30
 * @version 1.0.0
 */

import { logger } from './logger';

/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
  backoffMultiplier?: number;
  retryableErrors?: string[]; // Error messages/types to retry
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing - reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening circuit
  successThreshold?: number; // Successes to close circuit from half-open
  timeout?: number; // Time to wait before half-open (ms)
  name?: string; // Circuit identifier for logging
}

/**
 * Rate limiter options (token bucket algorithm)
 */
export interface RateLimiterOptions {
  tokensPerInterval: number; // Tokens added per interval
  interval: number; // Interval in milliseconds
  maxTokens?: number; // Bucket capacity
}

/**
 * Exponential backoff retry wrapper
 *
 * Usage:
 * ```ts
 * const result = await retry(
 *   () => apiCall(),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = [],
    onRetry,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable =
        retryableErrors.length === 0 ||
        retryableErrors.some(
          (msg) =>
            lastError.message.includes(msg) || lastError.name.includes(msg)
        );

      if (!isRetryable || attempt === maxAttempts) {
        throw lastError;
      }

      // Log retry attempt
      logger.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
        error: lastError.message,
        delay,
      });

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry
      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError!;
}

/**
 * Circuit Breaker implementation
 * Prevents cascading failures by failing fast when service is down
 *
 * Usage:
 * ```ts
 * const breaker = new CircuitBreaker({ failureThreshold: 5 });
 * const result = await breaker.execute(() => apiCall());
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000,
      name: options.name ?? 'anonymous',
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker [${this.options.name}] is OPEN - service unavailable`
        );
      }
      // Transition to half-open
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker [${this.options.name}] is HALF_OPEN - testing service`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker [${this.options.name}] is CLOSED - service recovered`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (
      this.failureCount >= this.options.failureThreshold ||
      this.state === CircuitState.HALF_OPEN
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;

      logger.error(`Circuit breaker [${this.options.name}] is OPEN`, {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`Circuit breaker [${this.options.name}] manually reset`);
  }
}

/**
 * Rate Limiter using Token Bucket algorithm
 * Enforces API rate limits and prevents abuse
 *
 * Usage:
 * ```ts
 * const limiter = new RateLimiter({ tokensPerInterval: 10, interval: 1000 });
 * await limiter.acquire(); // Wait for token
 * // Make API call
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    this.options = {
      tokensPerInterval: options.tokensPerInterval,
      interval: options.interval,
      maxTokens: options.maxTokens ?? options.tokensPerInterval,
    };
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token (wait if necessary)
   */
  async acquire(tokens = 1): Promise<void> {
    while (this.tokens < tokens) {
      const waitTime = this.getWaitTime();
      await sleep(waitTime);
      this.refill();
    }

    this.tokens -= tokens;
  }

  /**
   * Try to acquire without waiting
   */
  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (elapsed / this.options.interval) * this.options.tokensPerInterval
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokens + tokensToAdd, this.options.maxTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Calculate wait time for next token
   */
  private getWaitTime(): number {
    const tokensNeeded = 1 - this.tokens;
    return (tokensNeeded / this.options.tokensPerInterval) * this.options.interval;
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Graceful degradation helper
 * Returns fallback value on error
 *
 * Usage:
 * ```ts
 * const result = await graceful(
 *   () => apiCall(),
 *   'fallback value'
 * );
 * ```
 */
export async function graceful<T>(
  fn: () => Promise<T>,
  fallback: T,
  options?: { logError?: boolean }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (options?.logError !== false) {
      logger.warn('Graceful degradation triggered', {
        error: (error as Error).message,
      });
    }
    return fallback;
  }
}

/**
 * Timeout wrapper
 * Throws error if function takes too long
 *
 * Usage:
 * ```ts
 * const result = await timeout(
 *   () => apiCall(),
 *   5000 // 5 seconds
 * );
 * ```
 */
export async function timeout<T>(
  fn: () => Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    sleep(ms).then(() => {
      throw new Error(errorMessage);
    }),
  ]);
}

/**
 * Combine retry + circuit breaker
 * Enterprise-grade resilience pattern
 *
 * Usage:
 * ```ts
 * const resilientCall = resilient(
 *   () => apiCall(),
 *   {
 *     retry: { maxAttempts: 3 },
 *     breaker: { failureThreshold: 5 }
 *   }
 * );
 * ```
 */
export async function resilient<T>(
  fn: () => Promise<T>,
  options: {
    retry?: RetryOptions;
    breaker?: CircuitBreaker;
    timeout?: number;
  } = {}
): Promise<T> {
  let wrappedFn = fn;

  // Add timeout if specified
  if (options.timeout) {
    wrappedFn = () => timeout(fn, options.timeout!);
  }

  // Wrap with circuit breaker
  if (options.breaker) {
    const breaker = options.breaker;
    wrappedFn = () => breaker.execute(wrappedFn);
  }

  // Wrap with retry
  if (options.retry) {
    wrappedFn = () => retry(wrappedFn, options.retry);
  }

  return wrappedFn();
}
