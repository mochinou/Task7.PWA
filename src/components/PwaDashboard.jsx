import { HardDrive, Loader2, RefreshCw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useInstallPrompt, useNetworkStatus, useServiceWorker } from '../hooks/usePwa';
import { checkForUpdates, requestServiceWorkerVersion } from '../pwa/serviceWorkerRegistration';
import { clearRuntimeCaches, getCacheStats } from '../services/offlineCacheService';
import { InstallButton } from './PwaStatus';

const STRATEGIES = [
  {
    resource: 'App shell (HTML, hashed JS/CSS, icons, offline page)',
    strategy: 'Precache · cache-first',
    limits: 'Versioned per deploy, old versions deleted on activate',
  },
  {
    resource: 'Page navigations (SPA routes)',
    strategy: 'App shell from precache → network → offline.html',
    limits: 'Uncached data routes redirect to /offline',
  },
  {
    resource: 'Public API: product list, search, categories, details',
    strategy: 'Network-first (4s timeout) → cache fallback',
    limits: 'Max 80 entries · 7 days',
  },
  {
    resource: 'Images & fonts',
    strategy: 'Cache-first',
    limits: 'Max 120 entries · 30 days',
  },
  {
    resource: 'Firebase Auth, tokens, user profile photos, POST/PUT/DELETE',
    strategy: 'Network-only (never cached)',
    limits: '—',
  },
];

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CachingStrategiesTable() {
  return (
    <div className="table-wrap">
      <table className="responsive-table">
        <thead>
          <tr>
            <th scope="col">Resource</th>
            <th scope="col">Strategy</th>
            <th scope="col">Cache limits</th>
          </tr>
        </thead>
        <tbody>
          {STRATEGIES.map((row) => (
            <tr key={row.resource}>
              <td data-label="Resource">{row.resource}</td>
              <td data-label="Strategy">
                <span className="strategy-pill">{row.strategy}</span>
              </td>
              <td data-label="Cache limits">{row.limits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PwaDashboard() {
  const sw = useServiceWorker();
  const { installed } = useInstallPrompt();
  const { status } = useNetworkStatus();
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  const refreshStats = useCallback(async () => {
    setStats(await getCacheStats());
  }, []);

  useEffect(() => {
    let active = true;
    getCacheStats().then((result) => {
      if (active) setStats(result);
    });
    requestServiceWorkerVersion();
    return () => {
      active = false;
    };
  }, []);

  const handleCheckUpdates = async () => {
    setBusy('update');
    const ok = await checkForUpdates();
    setBusy(null);
    setMessage(
      ok
        ? 'Checked for updates. If a new version exists, an update prompt will appear.'
        : 'Update check is unavailable (offline or development mode).'
    );
  };

  const handleClear = async () => {
    setBusy('clear');
    await clearRuntimeCaches();
    await refreshStats();
    setBusy(null);
    setMessage('Saved API data and images were removed. The app shell stays installed.');
  };

  const swStatus = !sw.supported
    ? 'Not supported'
    : !sw.enabled
      ? 'Disabled in development'
      : sw.error
        ? `Error: ${sw.error}`
        : sw.registration?.active
          ? 'Active'
          : 'Installing…';

  const displayMode = installed ? 'Installed (standalone)' : 'Browser tab';

  return (
    <div className="pwa-dashboard">
      <div className="dashboard-grid">
        <div className="stat-card">
          <ShieldCheck size={20} style={{ color: 'var(--success)', marginBottom: '0.4rem' }} />
          <div className="stat-value stat-value-sm">{swStatus}</div>
          <div className="stat-label">Service Worker</div>
        </div>
        <div className="stat-card">
          <RefreshCw size={20} style={{ color: 'var(--primary)', marginBottom: '0.4rem' }} />
          <div className="stat-value stat-value-sm mono">{sw.version || '—'}</div>
          <div className="stat-label">Cache version</div>
        </div>
        <div className="stat-card">
          <Smartphone size={20} style={{ color: 'var(--warning)', marginBottom: '0.4rem' }} />
          <div className="stat-value stat-value-sm">{displayMode}</div>
          <div className="stat-label">Display mode</div>
        </div>
        <div className="stat-card">
          <HardDrive size={20} style={{ color: 'var(--primary)', marginBottom: '0.4rem' }} />
          <div className="stat-value stat-value-sm">
            {formatBytes(stats?.usage)}
          </div>
          <div className="stat-label">
            Storage used · {status === 'online' ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {stats?.caches?.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '1rem' }}>
          <table className="responsive-table">
            <thead>
              <tr>
                <th scope="col">Cache</th>
                <th scope="col">Contents</th>
                <th scope="col">Entries</th>
              </tr>
            </thead>
            <tbody>
              {stats.caches.map((cache) => (
                <tr key={cache.name}>
                  <td data-label="Cache" className="mono">
                    {cache.name}
                  </td>
                  <td data-label="Contents">{cache.type}</td>
                  <td data-label="Entries">{cache.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="status" style={{ marginTop: '1rem' }}>
          {message}
        </div>
      )}

      <div className="dashboard-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCheckUpdates}
          disabled={busy !== null}
        >
          {busy === 'update' ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
          Check for updates
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleClear}
          disabled={busy !== null || !stats?.supported}
        >
          {busy === 'clear' ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
          Clear offline data
        </button>
        <InstallButton className="btn btn-primary" />
      </div>
    </div>
  );
}
