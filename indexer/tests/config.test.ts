/**
 * Tests for Issue #46 – Indexer Configuration Validation
 */

import { validateConfig } from "../src/config.js";

// Silence logger output during tests
jest.mock("../src/logger.js", () => ({
  configLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  indexerLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn(), debug: jest.fn() },
  ingesterLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  loaderLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  backfillLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  workerLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  websocketLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe("validateConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.STELLAR_NETWORK;
    delete process.env.DATABASE_URL;
    delete process.env.POLL_INTERVAL_MS;
    delete process.env.HEALTH_PORT;
    delete process.env.WS_PORT;
    delete process.env.BACKFILL_CONCURRENCY;
    delete process.env.BACKFILL_BATCH_SIZE;
    delete process.env.BACKFILL_BATCH_DELAY_MS;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_PRETTY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns defaults when no env vars are set", () => {
    const config = validateConfig();
    expect(config.network).toBe("testnet");
    expect(config.databaseUrl).toBeNull();
    expect(config.pollIntervalMs).toBe(5000);
    expect(config.healthPort).toBe(3001);
    expect(config.wsPort).toBe(8080);
    expect(config.backfillConcurrency).toBe(4);
    expect(config.backfillBatchSize).toBe(10);
    expect(config.backfillBatchDelayMs).toBe(200);
    expect(config.logLevel).toBe("info");
    expect(config.logPretty).toBe(false);
  });

  it("accepts valid STELLAR_NETWORK values", () => {
    for (const network of ["testnet", "mainnet", "futurenet"]) {
      process.env.STELLAR_NETWORK = network;
      const config = validateConfig();
      expect(config.network).toBe(network);
    }
  });

  it("throws on invalid STELLAR_NETWORK", () => {
    process.env.STELLAR_NETWORK = "invalidnet";
    expect(() => validateConfig()).toThrow(/STELLAR_NETWORK/);
  });

  it("reads DATABASE_URL when set", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    const config = validateConfig();
    expect(config.databaseUrl).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("throws on non-integer POLL_INTERVAL_MS", () => {
    process.env.POLL_INTERVAL_MS = "not-a-number";
    expect(() => validateConfig()).toThrow(/POLL_INTERVAL_MS/);
  });

  it("throws on zero POLL_INTERVAL_MS", () => {
    process.env.POLL_INTERVAL_MS = "0";
    expect(() => validateConfig()).toThrow(/POLL_INTERVAL_MS/);
  });

  it("throws on invalid port", () => {
    process.env.HEALTH_PORT = "99999";
    expect(() => validateConfig()).toThrow(/HEALTH_PORT/);
  });

  it("accepts valid BACKFILL_CONCURRENCY", () => {
    process.env.BACKFILL_CONCURRENCY = "8";
    const config = validateConfig();
    expect(config.backfillConcurrency).toBe(8);
  });

  it("throws on non-positive BACKFILL_CONCURRENCY", () => {
    process.env.BACKFILL_CONCURRENCY = "-1";
    expect(() => validateConfig()).toThrow(/BACKFILL_CONCURRENCY/);
  });

  it("sets logPretty to true when LOG_PRETTY=true", () => {
    process.env.LOG_PRETTY = "true";
    const config = validateConfig();
    expect(config.logPretty).toBe(true);
  });
});
