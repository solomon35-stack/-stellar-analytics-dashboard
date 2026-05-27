# Query Performance

This document describes how database query performance is monitored, optimized, and reviewed.

## Index Strategy

Performance indexes are managed through migrations (see `1738100000000_add-performance-indexes.js`).

High-impact indexes include:

- `transactions(successful, created_at DESC)` for filtered transaction feeds
- `transactions(source_account, created_at DESC)` for account activity and distinct counts
- `operations(type, created_at DESC)` and partial payment index for analytics
- `account_metrics(account_id, timestamp DESC)` for account dashboards
- `asset_metrics(asset_id, timestamp DESC)` for latest asset metrics lookups

Apply migrations before relying on these indexes:

```bash
pnpm db:migrate
```

## Query Monitoring

The API records every query duration and flags slow queries.

Environment variables:

- `SLOW_QUERY_THRESHOLD_MS` (default: `100`)
- `SLOW_QUERY_LOG_SIZE` (default: `50`)
- `STATS_CACHE_TTL_SECONDS` (default: `60`)
- `NETWORK_METRICS_CACHE_TTL_SECONDS` (default: `30`)

Endpoints:

- `GET /metrics` — Prometheus-style DB query counters
- `GET /metrics/queries` — JSON snapshot with recent slow queries

Slow queries are also written to API logs (`warn` level).

## N+1 Prevention

GraphQL resolvers use per-request DataLoaders (`createLoaders()`), including:

- `transactionLoader`
- `transactionOperationsLoader`
- `ledgerLoader`

Loaders batch lookups by key and deduplicate requests within a single GraphQL operation.

## Caching

Redis cache-aside is used for expensive read paths:

- `stats` query (60s default TTL)
- `networkMetrics` query (30s default TTL)

Cache keys are derived from query parameters to avoid stale cross-filter responses.

## Execution Plan Analysis

Run plan analysis against your database:

```bash
export DATABASE_URL=postgresql://stellar:stellar@localhost:5432/stellar_analytics
sh scripts/database/analyze-query-plans.sh
```

Look for:

- `Seq Scan` on large tables where index scans are expected
- High `actual time=` in `EXPLAIN ANALYZE`
- Large `rows removed by filter`

## Regular Review Cadence

Recommended monthly checklist:

1. Review `/metrics/queries` slow-query log in staging/production
2. Run `scripts/database/analyze-query-plans.sh`
3. Validate migration history (`pnpm db:migrate`)
4. Capture top GraphQL operations and confirm DataLoader usage
5. Record findings and open follow-up migrations for missing indexes

## CI

Migration workflow (`.github/workflows/database-migrations.yml`) ensures schema/index changes apply cleanly on fresh Postgres instances.
