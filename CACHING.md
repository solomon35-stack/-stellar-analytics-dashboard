# Query Caching Strategy

## Overview

The API implements Redis-based query caching to reduce database load for frequently accessed data.

## Cache TTL Configuration

| Query Type | TTL | Rationale |
|------------|-----|-----------|
| Network Stats | 60 seconds | Frequently updated, near real-time |
| Ledger Data | 300 seconds | Updated less frequently, acceptable staleness |
| Account Stats | 300 seconds | Updated periodically, good performance |
| Asset Data | 300 seconds | Updated periodically, good performance |

## Implementation

Caching is implemented in the resolvers using the `db.cacheGet()` and `db.cacheSet()` methods:

```typescript
const cacheKey = `stats:latest`;
const cached = await db.cacheGet(cacheKey);
if (cached) return cached;

// Cache miss - query database
const result = await db.query(...);
await db.cacheSet(cacheKey, result, CACHE_TTL.NETWORK_STATS);
return result;
```

## Cache Monitoring

Cache hit/miss metrics are tracked via `db.incrementCacheMetric()`:

```typescript
await db.incrementCacheMetric('transactions');
```

## Cache Invalidation

Cache is automatically invalidated when TTL expires. For manual invalidation:

```typescript
await db.cacheDel('stats:latest');
```

## Environment Variables

- `REDIS_URL`: Redis connection string (required)

## Best Practices

1. Always use cache keys that include query parameters
2. Cache only aggregate queries, not individual record queries
3. Monitor cache hit rates for performance tuning
4. Use appropriate TTL based on data volatility