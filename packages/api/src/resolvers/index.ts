import { ledgerResolvers } from './ledgers';
import { transactionResolvers } from './transactions';
import { analyticsResolvers } from './analytics';
import { pubsub, EVENTS } from '../pubsub';

export const resolvers = {
  Query: {
    ...ledgerResolvers.Query,
    ...transactionResolvers.Query,
    ...analyticsResolvers.Query,
  },
  Mutation: {
    _empty: () => 'This is a placeholder for future mutations',
  },
  Subscription: {
    ledgerAdded: {
      subscribe: () => pubsub.asyncIterator([EVENTS.LEDGER_ADDED]),
      resolve: (payload: any) => payload.ledgerAdded,
    },
    transactionAdded: {
      subscribe: () => pubsub.asyncIterator([EVENTS.TRANSACTION_ADDED]),
      resolve: (payload: any) => payload.transactionAdded,
    },
    operationAdded: {
      subscribe: () => pubsub.asyncIterator([EVENTS.OPERATION_ADDED]),
      resolve: (payload: any) => payload.operationAdded,
    },
    networkMetricsUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.NETWORK_METRICS_UPDATED]),
      resolve: (payload: any) => payload.networkMetricsUpdated,
    },
    transactionsForAccount: {
      subscribe: (_: any, { accountId }: { accountId: string }) =>
        pubsub.asyncIterator([`${EVENTS.TRANSACTION_ADDED}.${accountId}`]),
      resolve: (payload: any) => payload.transactionAdded,
    },
    operationsForAccount: {
      subscribe: (_: any, { accountId }: { accountId: string }) =>
        pubsub.asyncIterator([`${EVENTS.OPERATION_ADDED}.account.${accountId}`]),
      resolve: (payload: any) => payload.operationAdded,
    },
    operationsForType: {
      subscribe: (_: any, { type }: { type: string }) =>
        pubsub.asyncIterator([`${EVENTS.OPERATION_ADDED}.type.${type}`]),
      resolve: (payload: any) => payload.operationAdded,
    },
  },
  Transaction: transactionResolvers.Transaction,
};
