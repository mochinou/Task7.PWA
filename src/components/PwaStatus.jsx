import {
  CheckCircle2,
  CloudOff,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInstallPrompt, useNetworkStatus, useServiceWorker } from '../hooks/usePwa';
import { promptInstall } from '../pwa/installPrompt';
import {
  applyUpdate,
  dismissOfflineReady,
  dismissUpdate,
} from '../pwa/serviceWorkerRegistration';
import { checkConnection } from '../services/networkMonitor';

/** Small pill in the navbar: verified online / offline / reconnecting state. */
export function ConnectivityIndicator() {
  const { status, checking } = useNetworkStatus();
  const isOnline = status === 'online';
  const label = isOnline ? 'Online' : checking ? 'Reconnecting…' : 'Offline';

  return (
    <button
      type="button"
      className={`net-pill ${isOnline ? 'net-online' : 'net-offline'}`}
      onClick={() => checkConnection()}
      title={
        isOnline
          ? 'Connected — click to re-check the connection'
          : 'No connection — click to retry'
      }
      aria-live="polite"
    >
      {checking ? (
        <Loader2 size={13} className="spin" aria-hidden="true" />
      ) : (
        <span className="net-dot" aria-hidden="true" />
      )}
      <span className="net-label">{label}</span>
    </button>
  );
}

/** Full-width banner: offline notice, then a short "back online" confirmation. */
export function NetworkBanner() {
  const { status, checking, previousStatus, lastChangedAt } = useNetworkStatus();
  const [dismissedChange, setDismissedChange] = useState(null);
  const justRestored =
    status === 'online' && previousStatus === 'offline' && dismissedChange !== lastChangedAt;

  // Hide the "back online" confirmation after a few seconds.
  useEffect(() => {
    if (!justRestored) return undefined;
    const timer = setTimeout(() => setDismissedChange(lastChangedAt), 3500);
    return () => clearTimeout(timer);
  }, [justRestored, lastChangedAt]);

  if (status === 'offline') {
    return (
      <div className="net-banner net-banner-offline" role="status">
        <div className="net-banner-inner">
          <WifiOff size={17} aria-hidden="true" />
          <span>
            <strong>You are offline.</strong> Previously visited pages and saved data are still
            available. Editing is disabled until you reconnect.
          </span>
          <button
            type="button"
            className="btn btn-sm net-banner-btn"
            onClick={() => checkConnection()}
            disabled={checking}
          >
            {checking ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (justRestored) {
    return (
      <div className="net-banner net-banner-online" role="status">
        <div className="net-banner-inner">
          <Wifi size={17} aria-hidden="true" />
          <span>
            <strong>Back online.</strong> Fresh data is being loaded.
          </span>
        </div>
      </div>
    );
  }

  return null;
}

/** Toasts for the Service Worker lifecycle: new version available / offline ready. */
export function UpdatePrompt() {
  const { updateAvailable, updating, offlineReady } = useServiceWorker();

  useEffect(() => {
    if (!offlineReady) return undefined;
    const timer = setTimeout(dismissOfflineReady, 6000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  if (updateAvailable) {
    return (
      <div className="toast" role="alertdialog" aria-labelledby="update-toast-title">
        <div className="toast-icon toast-icon-primary">
          <Sparkles size={18} />
        </div>
        <div className="toast-body">
          <strong id="update-toast-title">A new version is available</strong>
          <span>Update now to get the latest features and fixes.</span>
          <div className="toast-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={applyUpdate}
              disabled={updating}
            >
              {updating ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              {updating ? 'Updating…' : 'Update now'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={dismissUpdate}
              disabled={updating}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="toast" role="status">
        <div className="toast-icon toast-icon-success">
          <CheckCircle2 size={18} />
        </div>
        <div className="toast-body">
          <strong>Ready to work offline</strong>
          <span>NovaStore is cached on this device and can be installed.</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost toast-close"
          onClick={dismissOfflineReady}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}

/** "Install app" button, only rendered when the browser offers installation. */
export function InstallButton({ className = 'btn btn-sm btn-secondary', fullWidth = false }) {
  const { canInstall, installed } = useInstallPrompt();
  if (!canInstall || installed) return null;

  return (
    <button
      type="button"
      className={`${className} ${fullWidth ? 'btn-full' : ''}`}
      onClick={() => promptInstall()}
    >
      <Download size={15} />
      Install app
    </button>
  );
}

/** Inline badge used next to data that is served from the offline cache. */
export function OfflineDataNotice({ cachedAt }) {
  return (
    <div className="alert alert-info" role="status" style={{ marginBottom: '1rem' }}>
      <CloudOff size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <span>
        You are viewing <strong>saved offline data</strong>
        {cachedAt ? ` from ${new Date(cachedAt).toLocaleString()}` : ''}. It will refresh
        automatically when the connection returns.
      </span>
    </div>
  );
}
