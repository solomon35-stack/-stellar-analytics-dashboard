/**
 * Issue #43 – Indexer Metrics Collection
 *
 * Prometheus metrics for the indexer using the `prom-client` library.
 * Exposes a /metrics HTTP endpoint on the existing health-check server.
 *
 * Tracked metrics:
 *   - indexer_ledgers_processed_total          (counter)
 *   - indexer_transactions_processed_total     (counter)
 *   - indexer_operations_processed_total       (counter)
 *   - indexer_errors_total                     (counter, labelled by type)
 *   - indexer_validation_failures_total        (counter, labelled by entity)
 *   - indexer_idempotency_skips_total          (counter)
 *   - indexer_cycle_duration_seconds           (histogram)
 *   - indexer_db_write_duration_seconds        (histogram, labelled by table)
 *   - indexer_horizon_request_duration_seconds (histogram, labelled by endpoint)
 *   - indexer_circuit_breaker_state            (gauge: 0=CLOSED,1=HALF_OPEN,2=OPEN)
 *   - indexer_queue_depth                      (gauge)
 *   - indexer_last_processed_ledger_sequence   (gauge)
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

export class IndexerMetrics {
  private static instance: IndexerMetrics;
  readonly registry: Registry;

  // Counters
  readonly ledgersProcessed: Counter<string>;
  readonly transactionsProcessed: Counter<string>;
  readonly operationsProcessed: Counter<string>;
  readonly errorsTotal: Counter<string>;
  readonly validationFailures: Counter<string>;
  readonly idempotencySkips: Counter<string>;

  // Histograms
  readonly cycleDuration: Histogram<string>;
  readonly dbWriteDuration: Histogram<string>;
  readonly horizonRequestDuration: Histogram<string>;

  // Gauges
  readonly circuitBreakerState: Gauge<string>;
  readonly queueDepth: Gauge<string>;
  readonly lastProcessedLedger: Gauge<string>;

  private constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics (memory, CPU, event loop lag, etc.)
    collectDefaultMetrics({ register: this.registry });

    // -----------------------------------------------------------------------
    // Counters
    // -----------------------------------------------------------------------
    this.ledgersProcessed = new Counter({
      name: 'indexer_ledgers_processed_total',
      help: 'Total number of ledgers successfully processed',
      registers: [this.registry],
    });

    this.transactionsProcessed = new Counter({
      name: 'indexer_transactions_processed_total',
      help: 'Total number of transactions successfully processed',
      registers: [this.registry],
    });

    this.operationsProcessed = new Counter({
      name: 'indexer_operations_processed_total',
      help: 'Total number of operations successfully processed',
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: 'indexer_errors_total',
      help: 'Total number of errors encountered',
      labelNames: ['type'] as const,
      registers: [this.registry],
    });

    this.validationFailures = new Counter({
      name: 'indexer_validation_failures_total',
      help: 'Total number of Zod validation failures',
      labelNames: ['entity'] as const,
      registers: [this.registry],
    });

    this.idempotencySkips = new Counter({
      name: 'indexer_idempotency_skips_total',
      help: 'Total number of ledgers skipped because they were already processed',
      registers: [this.registry],
    });

    // -----------------------------------------------------------------------
    // Histograms
    // -----------------------------------------------------------------------
    this.cycleDuration = new Histogram({
      name: 'indexer_cycle_duration_seconds',
      help: 'Duration of a full indexer poll cycle in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.dbWriteDuration = new Histogram({
      name: 'indexer_db_write_duration_seconds',
      help: 'Duration of database write operations in seconds',
      labelNames: ['table'] as const,
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.horizonRequestDuration = new Histogram({
      name: 'indexer_horizon_request_duration_seconds',
      help: 'Duration of Horizon API requests in seconds',
      labelNames: ['endpoint'] as const,
      buckets: [0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // -----------------------------------------------------------------------
    // Gauges
    // -----------------------------------------------------------------------
    this.circuitBreakerState = new Gauge({
      name: 'indexer_circuit_breaker_state',
      help: 'Circuit breaker state: 0=CLOSED, 1=HALF_OPEN, 2=OPEN',
      registers: [this.registry],
    });

    this.queueDepth = new Gauge({
      name: 'indexer_queue_depth',
      help: 'Number of ledgers waiting to be processed',
      registers: [this.registry],
    });

    this.lastProcessedLedger = new Gauge({
      name: 'indexer_last_processed_ledger_sequence',
      help: 'Sequence number of the last successfully processed ledger',
      registers: [this.registry],
    });
  }

  static getInstance(): IndexerMetrics {
    if (!IndexerMetrics.instance) {
      IndexerMetrics.instance = new IndexerMetrics();
    }
    return IndexerMetrics.instance;
  }

  // ---------------------------------------------------------------------------
  // Convenience helpers
  // ---------------------------------------------------------------------------

  /** Map CircuitBreaker state string to a numeric gauge value. */
  setCircuitBreakerState(state: 'CLOSED' | 'HALF_OPEN' | 'OPEN'): void {
    const stateMap = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 } as const;
    this.circuitBreakerState.set(stateMap[state]);
  }

  /** Return the full Prometheus text exposition. */
  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}

export const metrics = IndexerMetrics.getInstance();
