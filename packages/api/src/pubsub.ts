import { PubSub } from 'graphql-subscriptions';

// Singleton PubSub instance shared across the API
// Note: For production with multiple instances, use RedisPubSub from graphql-redis-subscriptions
export const pubsub = new PubSub();

// Event channel names — keep in sync with subscription resolvers
export const EVENTS = {
  LEDGER_ADDED: 'LEDGER_ADDED',
  TRANSACTION_ADDED: 'TRANSACTION_ADDED',
  OPERATION_ADDED: 'OPERATION_ADDED',
  NETWORK_METRICS_UPDATED: 'NETWORK_METRICS_UPDATED',
} as const;

// Subscription rate limiting configuration
export const SUBSCRIPTION_RATE_LIMIT = {
  MAX_SUBSCRIPTIONS_PER_IP: 10,
  MAX_EVENTS_PER_SECOND: 50,
  RATE_LIMIT_WINDOW_MS: 60000,
};

// In-memory rate limit store (use Redis in production)
const subscriptionRateLimits = new Map<string, { count: number; resetTime: number }>();
const eventRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkSubscriptionRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = subscriptionRateLimits.get(ip);

  if (!limit || now > limit.resetTime) {
    subscriptionRateLimits.set(ip, { count: 1, resetTime: now + SUBSCRIPTION_RATE_LIMIT.RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (limit.count >= SUBSCRIPTION_RATE_LIMIT.MAX_SUBSCRIPTIONS_PER_IP) {
    return false;
  }

  limit.count++;
  return true;
}

export function checkEventRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = eventRateLimits.get(ip);

  if (!limit || now > limit.resetTime) {
    eventRateLimits.set(ip, { count: 1, resetTime: now + 1000 });
    return true;
  }

  if (limit.count >= SUBSCRIPTION_RATE_LIMIT.MAX_EVENTS_PER_SECOND) {
    return false;
  }

  limit.count++;
  return true;
}

export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [ip, limit] of subscriptionRateLimits.entries()) {
    if (now > limit.resetTime) {
      subscriptionRateLimits.delete(ip);
    }
  }
  for (const [ip, limit] of eventRateLimits.entries()) {
    if (now > limit.resetTime) {
      eventRateLimits.delete(ip);
    }
  }
}
