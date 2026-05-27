# Indexer Backfill Guide

This document covers the backfill strategy, parallel processing, configuration, and logging improvements added in issues #38, #45, #46, and #47.

---

## Overview

The indexer now supports two modes of operation:

| Mode | Description |
|------|-------------|
| **Live polling** | Polls Horizon every `POLL_INTERVAL_MS` ms for the latest ledger (default behaviour) |
| **Backfill** | Processes a historical ledger range using a parallel worker pool |

---

## Backfill Command (#38 & #45)

### Quick start

```bash
# Backfill ledgers 50000 to 51000 on testnet
npx tsx src/backfill-cli.ts --start=50000 --end=51000

# Backfill on mainnet with 8 parallel workers
npx tsx src/backfill-cli.ts --start=50000 --end=51000 --network=mainnet --concurrency=8

# Using the npm script alias
pnpm backfill -- --start=50000 --end=51000
```

### CLI flags

| Flag | Description | Default |
|------|-------------|---------|
| `--start=<seq>` | First ledger sequence (inclusive) | **required** |
| `--end=<seq>` | Last ledger sequence (inclusive) | **required** |
| `--network=<net>` | `testnet` \| `mainnet` \| `futurenet` | `testnet` |
| `--concurrency=<n>` | Parallel worker count | `BACKFILL_CONCURRENCY` env var or `4` |

### Environment variables

See `.env.example` for the full list. Backfill-specific variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKFILL_CONCURRENCY` | `4` | Number of parallel workers |
| `BACKFILL_BATCH_SIZE` | `10` | Ledgers per batch |
| `BACKFILL_BATCH_DELAY_MS` | `200` | Delay between batches (ms) to avoid rate-limiting |

### Parallel processing (#45)

Ledgers within each batch are fetched and written **concurrently** using a worker pool. The concurrency is bounded by `BACKFILL_CONCURRENCY` to prevent overwhelming Horizon or the database.

```
Batch 1: [seq 100, 101, 102, 103, 104]  ← up to 4 workers in parallel
Batch 2: [seq 105, 106, 107, 108, 109]  ← 200ms delay, then next batch
...
```

### Progress tracking

Progress is logged as structured JSON and also written to stderr as a human-readable line:

```
[backfill] 42% | processed=420 skipped=0 failed=0 | ETA 58s
```

The `onProgress` callback in `runBackfill()` can be used programmatically.

### Resume capability

The backfill is **idempotent** — ledgers already present in the database are automatically skipped (`ON CONFLICT DO NOTHING` in the loader, plus a pre-check query). To resume a failed run, simply re-run with the same `--start` and `--end` values.

If some ledgers failed, the result object includes `resumeFrom` pointing to the first failed sequence:

```
[backfill] Some ledgers failed. To resume, re-run with --start=50042
```

### Graceful cancellation

Send `SIGINT` (Ctrl+C) or `SIGTERM` to cancel after the current batch completes. No partial batches are left in an inconsistent state.

---

## Configuration Validation (#46)

All environment variables are validated on startup. If any value is invalid, the process exits immediately with a clear error listing **all** problems at once:

```
[config] Invalid configuration – fix the following issues:
  • STELLAR_NETWORK must be one of: testnet, mainnet, futurenet. Got: "prodnet"
  • BACKFILL_CONCURRENCY must be a positive integer. Got: "-1"

See indexer/.env.example for all available options.
```

Copy `.env.example` to `.env` and fill in your values before starting the indexer.

---

## Logging Framework (#47)

The indexer uses [Pino](https://getpino.io/) for structured, levelled logging.

### Log levels

| Level | When to use |
|-------|-------------|
| `trace` | Very verbose internal state |
| `debug` | Per-ledger processing details |
| `info` | Normal operational events (startup, ledger processed) |
| `warn` | Recoverable issues (missing DB, skipped ledger) |
| `error` | Processing failures |
| `fatal` | Unrecoverable errors that cause process exit |

Set the minimum level with `LOG_LEVEL=debug` (default: `info`).

### Output format

**Production** (default): newline-delimited JSON, easy to ship to any log aggregator (Datadog, CloudWatch, Loki, etc.):

```json
{"level":"info","time":"2024-01-15T10:30:00.000Z","service":"stellar-indexer","module":"indexer","network":"testnet","sequence":12345678,"txCount":42,"msg":"Ledger processed"}
```

**Development** (`LOG_PRETTY=true`): coloured, human-readable output via `pino-pretty`.

### Log rotation

In production mode, logs are written to `LOG_DIR/indexer.log` with daily rotation and a 7-day retention window (via `pino-roll`).

### Context correlation

Each module has a pre-built child logger with a `module` field for easy filtering:

```bash
# Show only backfill logs
cat logs/indexer.log | grep '"module":"backfill"'
```

You can create additional child loggers for request-level correlation:

```typescript
import { createChildLogger } from "./logger.js";
const log = createChildLogger({ requestId: "abc-123", ledger: 12345 });
log.info("Processing ledger");
// → {"module":"...","requestId":"abc-123","ledger":12345,"msg":"Processing ledger"}
```
