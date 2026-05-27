import { db } from './connection';

export async function cachedQuery<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await db.cacheGet<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const result = await fetcher();
  await db.cacheSet(cacheKey, result, ttlSeconds);
  return result;
}

export function buildCacheKey(prefix: string, parts: Record<string, unknown>): string {
  const serialized = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(':');

  return `${prefix}:${serialized}`;
}
