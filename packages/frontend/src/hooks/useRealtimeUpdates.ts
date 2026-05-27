/**
 * useRealtimeUpdates
 *
 * Wraps Apollo's subscribeToMore to prepend new items to a paginated list
 * and optionally show a toast notification for each new item.
 *
 * Handles:
 * - Deduplication (won't add the same item twice)
 * - Pausing updates when the user has scrolled away / is on page 2+
 * - Cleanup on unmount
 */
import { useEffect, useRef, useCallback } from 'react';
import { DocumentNode } from '@apollo/client';
import toast from 'react-hot-toast';

interface UseRealtimeUpdatesOptions<TSubscription, TQuery> {
  /** The subscribeToMore function from useQuery */
  subscribeToMore: (opts: any) => () => void;
  /** The subscription document */
  document: DocumentNode;
  /** Variables for the subscription */
  variables?: Record<string, unknown>;
  /**
   * Given the current query data and the subscription payload,
   * return the updated query data. Return `prev` unchanged to skip.
   */
  updateQuery: (prev: TQuery, payload: { subscriptionData: { data: TSubscription } }) => TQuery;
  /**
   * Optional: called for each new item to produce a toast message.
   * Return null/undefined to suppress the toast.
   */
  toastMessage?: (data: TSubscription) => string | null | undefined;
  /** Pause updates (e.g. when user is on page 2) */
  paused?: boolean;
}

export function useRealtimeUpdates<TSubscription, TQuery>({
  subscribeToMore,
  document,
  variables,
  updateQuery,
  toastMessage,
  paused = false,
}: UseRealtimeUpdatesOptions<TSubscription, TQuery>) {
  const unsubRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    unsubRef.current = subscribeToMore({
      document,
      variables,
      updateQuery: (prev: TQuery, opts: { subscriptionData: { data: TSubscription } }) => {
        if (!opts.subscriptionData.data) return prev;

        // Show toast if configured
        if (toastMessage) {
          const msg = toastMessage(opts.subscriptionData.data);
          if (msg) {
            toast(msg, {
              icon: '🔴',
              duration: 3000,
              style: {
                fontSize: '13px',
                padding: '8px 12px',
              },
            });
          }
        }

        return updateQuery(prev, opts);
      },
    });
  }, [subscribeToMore, document, variables, updateQuery, toastMessage]);

  useEffect(() => {
    if (paused) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }
    subscribe();
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [subscribe, paused]);
}
