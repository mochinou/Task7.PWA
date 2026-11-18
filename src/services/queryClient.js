import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration:
 * - staleTime (2 min): Cached entries remain fresh for 2 minutes without redundant network requests.
 * - gcTime (10 min): Unused cache entries expire and are garbage-collected after 10 minutes.
 * - refetchOnWindowFocus / refetchOnReconnect: revalidate stale data when the user returns
 *   or when the connection really comes back (see services/networkMonitor.js).
 * - networkMode 'offlineFirst': the request is still sent while offline so the Service
 *   Worker can answer it from its runtime cache (TanStack's default 'online' mode would
 *   pause the query and never reach the SW).
 */
export const CACHE_CONFIG = {
  STALE_TIME_MS: 2 * 60 * 1000,
  GC_TIME_MS: 10 * 60 * 1000,
};

function shouldRetry(failureCount, error) {
  if (error?.isOffline) return false; // no point retrying, reconnect will refetch
  if (error?.status === 404) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_CONFIG.STALE_TIME_MS,
      gcTime: CACHE_CONFIG.GC_TIME_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
      retry: shouldRetry,
    },
    mutations: {
      // Fail fast with a clear "you are offline" error instead of hanging in "pending".
      networkMode: 'always',
      retry: 0,
    },
  },
});
