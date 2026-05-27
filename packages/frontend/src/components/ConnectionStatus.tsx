import { clsx } from 'clsx';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus';

/**
 * Shows the WebSocket connection state in the header.
 * Replaces the static "Mainnet" badge with a live indicator.
 */
export function ConnectionStatus() {
  const { status, label, isLive, isError, isPending } = useWebSocketStatus();

  return (
    <div
      className={clsx(
        'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-500',
        isLive && 'bg-green-500/10 border-green-500/20',
        isError && 'bg-red-500/10 border-red-500/20',
        isPending && 'bg-yellow-500/10 border-yellow-500/20'
      )}
      title={`WebSocket: ${status}`}
    >
      {isLive && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}

      {isError && (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}

      {isPending && (
        <>
          <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />
          <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
            {label}
          </span>
        </>
      )}
    </div>
  );
}
