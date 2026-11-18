import { CloudOff, Database, Loader2, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/usePwa';

function formatTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatSavedAt(timestamp) {
  if (!timestamp) return 'earlier';
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/**
 * Shows where the visible data comes from:
 *  - live network data held in the TanStack Query memory cache
 *  - an offline copy served by the Service Worker runtime cache (with saved time)
 */
export function CacheStatusBar({ queryKey, isFetching, dataUpdatedAt, onRevalidate, cacheMeta }) {
  const { isOnline } = useNetworkStatus();
  const fromOfflineCache = cacheMeta?.source === 'cache';
  const viewingCached = fromOfflineCache || !isOnline;

  let badge;
  if (isFetching) {
    badge = (
      <span className="status-badge status-fetching">
        <Loader2 size={12} className="spin" />
        Fetching / Revalidating
      </span>
    );
  } else if (viewingCached) {
    badge = (
      <span
        className="status-badge status-offline"
        title="Served from the Service Worker cache because the network is unavailable"
      >
        <CloudOff size={12} />
        {fromOfflineCache
          ? `Offline copy · saved ${formatSavedAt(cacheMeta?.cachedAt)}`
          : 'Offline · showing cached data'}
      </span>
    );
  } else {
    badge = (
      <span className="status-badge status-fresh">
        <Database size={12} />
        Live data · cached (TTL: 2m stale / 10m GC)
      </span>
    );
  }

  return (
    <div className={`cache-bar ${viewingCached ? 'cache-bar-offline' : ''}`}>
      <div className="cache-bar-left">
        {badge}

        <span className="query-key-pill" title={JSON.stringify(queryKey)}>
          Key: {JSON.stringify(queryKey)}
        </span>

        <span className="cache-bar-time">Updated: {formatTime(dataUpdatedAt)}</span>
      </div>

      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={onRevalidate}
        disabled={isFetching || !isOnline}
        title={isOnline ? 'Force revalidate cached server data' : 'Unavailable while offline'}
      >
        <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
        Revalidate
      </button>
    </div>
  );
}
