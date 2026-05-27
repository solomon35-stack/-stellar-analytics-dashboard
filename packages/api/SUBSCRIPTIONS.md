# GraphQL Subscriptions

## Overview

The Stellar Analytics API supports GraphQL subscriptions for real-time data updates. These are implemented using WebSocket and integrated with the PubSub system.

## Available Subscriptions

### Ledger Updates
```graphql
subscription {
  ledgerAdded {
    sequence
    closedAt
    successfulTransactionCount
    failedTransactionCount
    operationCount
  }
}
```

### Transaction Updates
```graphql
subscription {
  transactionAdded {
    hash
    successful
    ledger
    feeCharged
    sourceAccount
  }
}
```

### Operation Updates
```graphql
subscription {
  operationAdded {
    id
    type
    sourceAccount
    transactionSuccessful
  }
}
```

### Network Metrics Updates
```graphql
subscription {
  networkMetricsUpdated {
    timestamp
    ledgerCount
    transactionCount
    activeAccounts
    successRate
  }
}
```

### Filtered Subscriptions

Subscribe to transactions for a specific account:
```graphql
subscription {
  transactionsForAccount(accountId: "GBPXXXXX...") {
    hash
    successful
    feeCharged
  }
}
```

Subscribe to operations of a specific type:
```graphql
subscription {
  operationsForType(type: "payment") {
    id
    type
    details
  }
}
```

## Authentication

Subscriptions support JWT authentication via connection parameters:

```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:4000/graphql',
  connectionParams: {
    token: 'your-jwt-token'
  }
});
```

## Rate Limiting

- Maximum 10 subscriptions per IP address
- Maximum 50 events per second per IP
- Rate limit errors return a descriptive error message

## Connection Example

```typescript
import { WebSocket } from 'ws';
import { createClient } from 'graphql-ws';

const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
});

const onNext = (data: any) => {
  console.log('Received update:', data);
};

wsClient.subscribe(
  { query: 'subscription { ledgerAdded { sequence } }' },
  { next: onNext }
);
```