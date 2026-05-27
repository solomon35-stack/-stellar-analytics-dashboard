/**
 * Issue #44 – Indexer Idempotency
 *
 * Tracks which ledger sequences have already been fully processed so that
 * re-runs (restarts, backfills, duplicate stream events) are safe no-ops.
 *
 * Storage strategy:
 *   Primary   – `processed_ledgers` Postgres table (durable, survives restarts)
 *   Secondary – in-memory Set cache (fast path, avoids a DB round-trip per cycle)
 *
 * The table is created automatically on first use (idempotent DDL).
 */

import { Pool } from 'pg';
import { metrics } from '../metrics/IndexerMetrics';

export class IdempotencyTracker {
  /** In-memory cache of processed sequences (populated on startup + updated on write) */
  private processedCache = new Set<number>();
  private initialized = false;

  constructor(private readonly pool: Pool) {}

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Create the tracking table if it doesn't exist and warm the in-memory cache
   * with the most recent N sequences (avoids loading the entire history).
   */
  async initialize(warmCacheSize = 10_000): Promise<void> {
    if (this.initialized) return;

    const client = await this.pool.connect();
    try {
      // Create table – safe to run multiple times
      await client.query(`
        CREATE TABLE IF NOT EXISTS processed_ledgers (
          sequence        BIGINT PRIMARY KEY,
          processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          tx_count        INTEGER NOT NULL DEFAULT 0,
          op_count        INTEGER NOT NULL DEFAULT 0
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_ledgers_processed_at
          ON processed_ledgers (processed_at DESC)
      `);

      // Warm cache with recent sequences
      const { rows } = await client.query<{ sequence: string }>(
        `SELECT sequence FROM processed_ledgers
         ORDER BY sequence DESC
         LIMIT $1`,
        [warmCacheSize],
      );

      for (const row of rows) {
        this.processedCache.add(Number(row.sequence));
      }

      this.initialized = true;
      console.log(
        `[idempotency] initialized – ${this.processedCache.size} sequences loaded into cache`,
      );
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the ledger sequence has already been processed.
   * Checks the in-memory cache first; falls back to the DB for sequences
   * that pre-date the warm-cache window.
   */
  async isProcessed(sequence: number): Promise<boolean> {
    if (this.processedCache.has(sequence)) return true;

    // DB fallback for sequences outside the warm-cache window
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM processed_ledgers WHERE sequence = $1) AS exists`,
        [sequence],
      );
      const exists = rows[0]?.exists ?? false;
      if (exists) this.processedCache.add(sequence); // backfill cache
      return exists;
    } finally {
      client.release();
    }
  }

  /**
   * Mark a ledger sequence as processed.
   * Idempotent – safe to call multiple times for the same sequence.
   */
  async markProcessed(sequence: number, txCount = 0, opCount = 0): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO processed_ledgers (sequence, tx_count, op_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (sequence) DO NOTHING`,
        [sequence, txCount, opCount],
      );
      this.processedCache.add(sequence);
    } finally {
      client.release();
    }
  }

  /**
   * Check and skip helper – returns true if the ledger was already processed
   * and increments the idempotency-skip metric.
   */
  async shouldSkip(sequence: number): Promise<boolean> {
    const already = await this.isProcessed(sequence);
    if (already) {
      console.log(`[idempotency] skipping already-processed ledger ${sequence}`);
      metrics.idempotencySkips.inc();
    }
    return already;
  }

  /**
   * Return the highest sequence number that has been marked as processed,
   * or null if no ledgers have been processed yet.
   */
  async getLastProcessedSequence(): Promise<number | null> {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query<{ sequence: string }>(
        `SELECT sequence FROM processed_ledgers ORDER BY sequence DESC LIMIT 1`,
      );
      return rows.length > 0 ? Number(rows[0].sequence) : null;
    } finally {
      client.release();
    }
  }

  /** How many sequences are currently in the in-memory cache. */
  cacheSize(): number {
    return this.processedCache.size;
  }
}
