import { useEffect, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { installPromptStore } from '../pwa/installPrompt';
import { serviceWorkerStore } from '../pwa/serviceWorkerRegistration';
import { isOfflineError } from '../services/apiClient';
import { networkMonitor } from '../services/networkMonitor';

/** { status: 'online' | 'offline', checking, lastCheckedAt, lastChangedAt } */
export function useNetworkStatus() {
  const snapshot = useSyncExternalStore(networkMonitor.subscribe, networkMonitor.getSnapshot);
  return { ...snapshot, isOnline: snapshot.status === 'online' };
}

export function useServiceWorker() {
  return useSyncExternalStore(serviceWorkerStore.subscribe, serviceWorkerStore.getSnapshot);
}

export function useInstallPrompt() {
  return useSyncExternalStore(installPromptStore.subscribe, installPromptStore.getSnapshot);
}

/**
 * When a query failed because the device is offline and there is no cached data
 * to show, the navigation cannot be completed -> redirect to the /offline page.
 * The original location is kept in ?from= so the user returns there on reconnect.
 */
export function useOfflineRedirect({ isError, error, data }) {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldRedirect = Boolean(isError && !data && isOfflineError(error));

  useEffect(() => {
    if (!shouldRedirect) return;
    const from = `${location.pathname}${location.search}`;
    navigate(`/offline?from=${encodeURIComponent(from)}`, { replace: true });
  }, [shouldRedirect, location.pathname, location.search, navigate]);
}
