import { useState, useEffect } from 'react';
import { subscribeToWsStatus, type WsStatus } from '@/graphql/apollo-client';

/**
 * Returns the current WebSocket connection status and a human-readable label.
 * Subscribes to the status observable from the graphql-ws client.
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    const unsub = subscribeToWsStatus(setStatus);
    return unsub;
  }, []);

  const label: Record<WsStatus, string> = {
    connecting: 'Connecting…',
    connected: 'Live',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
    error: 'Connection error',
  };

  const isLive = status === 'connected';
  const isError = status === 'disconnected' || status === 'error';
  const isPending = status === 'connecting' || status === 'reconnecting';

  return { status, label: label[status], isLive, isError, isPending };
}
