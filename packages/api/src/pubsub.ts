import { PubSub } from 'graphql-subscriptions';

// Singleton PubSub instance shared across the API
export const pubsub = new PubSub();

// Event channel names — keep in sync with subscription resolvers
export const EVENTS = {
  LEDGER_ADDED: 'LEDGER_ADDED',
  TRANSACTION_ADDED: 'TRANSACTION_ADDED',
  OPERATION_ADDED: 'OPERATION_ADDED',
  NETWORK_METRICS_UPDATED: 'NETWORK_METRICS_UPDATED',
} as const;
