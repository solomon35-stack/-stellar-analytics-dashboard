/**
 * Tests for Issue #38 – Backfill Strategy
 *       Issue #45 – Parallel Processing
 */

import { runBackfill, parseBackfillArgs, type BackfillOptions } from "../src/backfill.js";
import type { IndexerConfig } from "../src/config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Silence logger
jest.mock("../src/logger.js", () => ({
  backfillLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  configLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  indexerLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), debug: jest.fn() },
  ingesterLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  loaderLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  workerLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  websocketLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock transformer
jest.mock("../src/transformer.js", () => ({
  normalizeLedger: (data: any) => ({
    sequence: data.ledger.sequence,
    hash: data.ledger.hash,
    close_time: data.ledger.closed_at,
    tx_count: 0,
  }),
  normalizeTransactions: () => [],
  normalizeOperations: () => [],
  normalizePayments: () => [],
}));

// Mock loader
const mockWriteIngestedData = jest.fn().mockResolvedValue(undefined);
jest.mock("../src/loader.js", () => ({
  writeIngestedData: (...args: any[]) => mockWriteIngestedData(...args),
}));

// Mock Horizon SDK
const mockLedgerCall = jest.fn();
const mockTxCall = jest.fn();
const mockOpCall = jest.fn();

jest.mock("@stellar/stellar-sdk", () => {
  const mockServer = {
    ledgers: () => ({
      ledger: () => ({ call: mockLedgerCall }),
    }),
    transactions: () => ({
      forLedger: () => ({ limit: () => ({ call: mockTxCall }) }),
    }),
    operations: () => ({
      forLedger: () => ({ limit: () => ({ call: mockOpCall }) }),
    }),
  };
  return {
    Horizon: {
      Server: jest.fn(() => mockServer),
    },
  };
});

// Mock shared network config
jest.mock("@stellar-analytics/shared", () => ({
  STELLAR_NETWORKS: {
    testnet: { horizonUrl: "https://horizon-testnet.stellar.org" },
    mainnet: { horizonUrl: "https://horizon.stellar.org" },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLedger(sequence: number) {
  return {
    sequence,
    hash: `hash-${sequence}`,
    closed_at: new Date().toISOString(),
    successful_transaction_count: 0,
  };
}

const baseConfig: IndexerConfig = {
  network: "testnet",
  databaseUrl: null,
  pollIntervalMs: 5000,
  healthPort: 3001,
  wsPort: 8080,
  logLevel: "info",
  logPretty: false,
  logDir: "logs",
  backfillConcurrency: 2,
  backfillBatchSize: 3,
  backfillBatchDelayMs: 0, // no delay in tests
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runBackfill", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: ledger fetch succeeds, no existing data in DB
    mockLedgerCall.mockImplementation(async () => makeLedger(1));
    mockTxCall.mockResolvedValue({ records: [] });
    mockOpCall.mockResolvedValue({ records: [] });
  });

  it("processes all ledgers in the range", async () => {
    // Make each ledger call return the correct sequence
    mockLedgerCall.mockImplementation(async () => makeLedger(100));

    const result = await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 104,
      pool: null, // dry-run
      config: baseConfig,
    });

    expect(result.processed + result.skipped).toBe(5);
    expect(result.failed).toBe(0);
  });

  it("skips ledgers already in the database", async () => {
    // Simulate a pool that says ledger 101 is already indexed
    const mockPool = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockImplementation(async (_sql: string, params: any[]) => {
          // sequence 101 is already indexed
          return { rowCount: params[0] === 101 ? 1 : 0 };
        }),
        release: jest.fn(),
      }),
    };

    mockLedgerCall.mockImplementation(async () => makeLedger(100));

    const result = await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 102,
      pool: mockPool,
      config: baseConfig,
    });

    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(2);
  });

  it("records failed ledgers and returns resumeFrom", async () => {
    // Fail ledger 102
    mockLedgerCall.mockImplementation(async () => {
      throw new Error("Horizon timeout");
    });

    const result = await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 102,
      pool: null,
      config: baseConfig,
    });

    expect(result.failed).toBe(3);
    expect(result.resumeFrom).not.toBeNull();
  });

  it("respects AbortSignal cancellation", async () => {
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    const result = await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 199, // 100 ledgers
      pool: null,
      config: { ...baseConfig, backfillBatchSize: 5 },
      signal: controller.signal,
    });

    // Should have processed 0 or very few ledgers
    expect(result.processed + result.skipped + result.failed).toBeLessThan(100);
  });

  it("throws when startSequence > endSequence", async () => {
    await expect(
      runBackfill({
        network: "testnet",
        startSequence: 200,
        endSequence: 100,
        pool: null,
        config: baseConfig,
      })
    ).rejects.toThrow(/startSequence/);
  });

  it("calls onProgress callback", async () => {
    mockLedgerCall.mockImplementation(async () => makeLedger(100));
    const onProgress = jest.fn();

    await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 105,
      pool: null,
      config: { ...baseConfig, backfillBatchSize: 2 },
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
    expect(lastCall.total).toBe(6);
    expect(lastCall.percent).toBeGreaterThan(0);
  });

  it("returns correct durationMs", async () => {
    mockLedgerCall.mockImplementation(async () => makeLedger(100));

    const result = await runBackfill({
      network: "testnet",
      startSequence: 100,
      endSequence: 100,
      pool: null,
      config: baseConfig,
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// parseBackfillArgs tests
// ---------------------------------------------------------------------------

describe("parseBackfillArgs", () => {
  it("parses --start and --end", () => {
    const args = parseBackfillArgs(["--start=50000", "--end=51000"]);
    expect(args.startSequence).toBe(50000);
    expect(args.endSequence).toBe(51000);
    expect(args.network).toBe("testnet"); // default
  });

  it("parses --network flag", () => {
    const args = parseBackfillArgs(["--start=1", "--end=10", "--network=mainnet"]);
    expect(args.network).toBe("mainnet");
  });

  it("parses --concurrency flag", () => {
    const args = parseBackfillArgs(["--start=1", "--end=10", "--concurrency=8"]);
    expect(args.concurrency).toBe(8);
  });

  it("throws when --start is missing", () => {
    expect(() => parseBackfillArgs(["--end=100"])).toThrow(/Usage/);
  });

  it("throws when --end is missing", () => {
    expect(() => parseBackfillArgs(["--start=100"])).toThrow(/Usage/);
  });
});
