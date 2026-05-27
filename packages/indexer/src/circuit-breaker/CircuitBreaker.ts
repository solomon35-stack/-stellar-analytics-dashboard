/**
 * Issue #41 – Indexer Circuit Breaker
 *
 * A simple, dependency-free circuit breaker that wraps async calls to the
 * Horizon API.  Three states:
 *
 *   CLOSED   – normal operation; failures are counted.
 *   OPEN     – threshold exceeded; calls are rejected immediately.
 *   HALF_OPEN – cooldown elapsed; one probe call is allowed through.
 *
 * Configuration (all optional, sensible defaults provided):
 *   failureThreshold   – consecutive failures before opening  (default 5)
 *   cooldownMs         – ms to wait before trying again       (default 5 min)
 *   successThreshold   – successes in HALF_OPEN to re-close   (default 2)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before the circuit opens. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to wait in OPEN state before moving to HALF_OPEN. Default: 300_000 (5 min) */
  cooldownMs?: number;
  /** Consecutive successes in HALF_OPEN needed to close the circuit. Default: 2 */
  successThreshold?: number;
  /** Optional name for log messages. Default: 'CircuitBreaker' */
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly successThreshold: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 300_000; // 5 minutes
    this.successThreshold = options.successThreshold ?? 2;
    this.name = options.name ?? 'CircuitBreaker';
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Execute `fn` through the circuit breaker.
   * Throws `CircuitOpenError` when the circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.transitionIfNeeded();

    if (this.state === 'OPEN') {
      const waitSec = Math.ceil((this.cooldownMs - (Date.now() - (this.lastFailureTime ?? 0))) / 1000);
      throw new CircuitOpenError(
        `[${this.name}] Circuit is OPEN. Retry in ~${waitSec}s.`,
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  /** Manually reset the circuit to CLOSED (e.g. from an admin endpoint). */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    console.log(`[${this.name}] Circuit manually reset to CLOSED`);
  }

  getState(): CircuitState {
    this.transitionIfNeeded();
    return this.state;
  }

  getStats() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private transitionIfNeeded(): void {
    if (
      this.state === 'OPEN' &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.cooldownMs
    ) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log(`[${this.name}] Circuit transitioned OPEN → HALF_OPEN (cooldown elapsed)`);
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(
        `[${this.name}] HALF_OPEN success ${this.successCount}/${this.successThreshold}`,
      );
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        console.log(`[${this.name}] Circuit transitioned HALF_OPEN → CLOSED`);
      }
    } else {
      // Reset failure streak on any success in CLOSED state
      this.failureCount = 0;
    }
  }

  private onFailure(err: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${message}`,
    );

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN re-opens the circuit
      this.state = 'OPEN';
      this.successCount = 0;
      console.error(`[${this.name}] Circuit transitioned HALF_OPEN → OPEN`);
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(
        `[${this.name}] Failure threshold reached (${this.failureThreshold}). Circuit OPEN. ` +
          `Cooldown: ${this.cooldownMs / 1000}s`,
      );
    }
  }
}

/** Thrown when a call is attempted while the circuit is OPEN. */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
