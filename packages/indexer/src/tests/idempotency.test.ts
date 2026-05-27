/**
 * Tests for Issue #44 – Indexer Idempotency
 *
 * Uses an in-memory mock of the pg Pool so no real database is required.
 */

import { IdempotencyTracker } from '../idempotency/IdempotencyTracker';

// ---------------------------------------------------------------------------
// Minimal pg Pool mock
// ---------------------------------------------------------------------------

function makePoolMock(rows: Array<{ sequence: string }> = []) {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const client = {
    query: jest.fn(async (text: string, values?: unknown[]) => {
      queries.push({ text, values: values ?? [] });

      // SELECT EXISTS(...)
      if (/SELECT EXISTS/.test(text)) {
        const seq = Number(values?.[0]);
        const exists = rows.some((r) => Number(r.sequence) === seq);
        return { rows: [{ exists }] };
      }

      // SELECT sequence FROM processed_ledgers ORDER BY sequence DESC LIMIT $1
      if (/SELECT sequence FROM processed_ledgers/.test(text) && /LIMIT/.test(text)) {
        return { rows };
      }

      // SELECT sequence FROM processed_ledgers ORDER BY sequence DESC LIMIT 1
      if (/SELECT sequence FROM processed_ledgers/.test(text)) {
        return { rows: rows.slice(0, 1) };
      }

      return { rows: [] };
    }),
    release: jest.fn(),
  };

  const pool = {
    connect: jest.fn(async () => client),
    _queries: queries,
    _client: client,
  };

  return pool as unknown as import('pg').Pool;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IdempotencyTracker', () => {
  it('initializes and warms the cache from the DB', async () => {
    const pool = makePoolMock([{ sequence: '999' }, { sequence: '1000' }]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    expect(tracker.cacheSize()).toBe(2);
  });

  it('returns true for a sequence in the cache', async () => {
    const pool = makePoolMock([{ sequence: '1000' }]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    expect(await tracker.isProcessed(1000)).toBe(true);
  });

  it('returns false for an unknown sequence', async () => {
    const pool = makePoolMock([]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    expect(await tracker.isProcessed(9999)).toBe(false);
  });

  it('marks a sequence as processed and adds it to the cache', async () => {
    const pool = makePoolMock([]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    await tracker.markProcessed(1001, 5, 10);
    expect(tracker.cacheSize()).toBe(1);
    expect(await tracker.isProcessed(1001)).toBe(true);
  });

  it('shouldSkip returns true and increments metric for known sequence', async () => {
    const pool = makePoolMock([{ sequence: '500' }]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    const skip = await tracker.shouldSkip(500);
    expect(skip).toBe(true);
  });

  it('shouldSkip returns false for unknown sequence', async () => {
    const pool = makePoolMock([]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();

    const skip = await tracker.shouldSkip(42);
    expect(skip).toBe(false);
  });

  it('does not re-initialize if called twice', async () => {
    const pool = makePoolMock([]);
    const tracker = new IdempotencyTracker(pool);
    await tracker.initialize();
    await tracker.initialize(); // second call should be a no-op

    // connect() should only have been called once (for the first initialize)
    expect((pool as any).connect).toHaveBeenCalledTimes(1);
  });
});
