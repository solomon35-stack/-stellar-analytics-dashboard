import { clsx } from 'clsx';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus';

/**
 * Shows the WebSocket connection state in the header.
 * Uses aria-live so status changes are announced to screen readers.
 */
export function ConnectionStatus() {
  const { status, label, isLive, isError, isPending } = useWebSocketStatus();

  const statusDescription = isLive
    ? `Connected to Mainnet — live data`
    : isError
      ? `Connection error — ${label}`
      : `Connecting — ${label}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusDescription}
      className={clsx(
        'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-500',
        isLive && 'bg-green-500/10 border-green-500/20',
        isError && 'bg-red-500/10 border-red-500/20',
        isPending && 'bg-yellow-500/10 border-yellow-500/20'
      )}
    >
      {isLive && (
        <>
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}

      {isError && (
        <>
          <WifiOff className="h-3 w-3 text-red-500" aria-hidden="true" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}

      {isPending && (
        <>
          <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" aria-hidden="true" />
          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}
    </div>
  );
}
