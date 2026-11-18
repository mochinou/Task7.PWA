import { onlineManager } from '@tanstack/react-query';
import { API_BASE_URL } from './config';

/**
 * Real connectivity monitor.
 *
 * `navigator.onLine` only says whether a network interface exists — it is `true`
 * on captive portals, broken Wi-Fi, or when the API is unreachable. This store
 * combines several signals:
 *   1. browser `online` / `offline` events (fast hint)
 *   2. an active heartbeat request to the API (`/test`, never cached by the SW)
 *   3. results of real API requests reported by apiClient (success / failure)
 * and feeds the result into TanStack Query's onlineManager so paused queries
 * resume and stale data is refetched as soon as the connection really returns.
 */

const PING_URL = `${API_BASE_URL}/test`;
const PING_TIMEOUT_MS = 5000;
const ONLINE_POLL_MS = 45000;
const OFFLINE_POLL_MS = 8000;

const listeners = new Set();

let state = {
  status: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  previousStatus: null,
  checking: false,
  lastCheckedAt: null,
  lastChangedAt: Date.now(),
};

let pollTimer = null;
let inFlightCheck = null;
let started = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch) {
  const next = { ...state, ...patch };
  if (patch.status && patch.status !== state.status) {
    next.lastChangedAt = Date.now();
    next.previousStatus = state.status;
  } else if (patch.status) {
    next.previousStatus = state.previousStatus;
  }
  state = next;
  emit();
}

function setStatus(status) {
  setState({ status });
  schedulePoll();
}

async function pingServer() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    // Any HTTP response (even 429/500) proves the network path works.
    await fetch(`${PING_URL}?ts=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Actively verifies connectivity. Resolves to `true` when online. */
export function checkConnection() {
  if (inFlightCheck) return inFlightCheck;

  inFlightCheck = (async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState({ lastCheckedAt: Date.now() });
      setStatus('offline');
      return false;
    }

    setState({ checking: true });
    const reachable = await pingServer();
    setState({ checking: false, lastCheckedAt: Date.now() });
    setStatus(reachable ? 'online' : 'offline');
    return reachable;
  })().finally(() => {
    inFlightCheck = null;
  });

  return inFlightCheck;
}

function schedulePoll() {
  if (!started) return;
  clearTimeout(pollTimer);
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const delay = state.status === 'online' ? ONLINE_POLL_MS : OFFLINE_POLL_MS;
  pollTimer = setTimeout(() => {
    checkConnection();
  }, delay);
}

let failureDebounce = null;

/** Called by apiClient when a request failed at the network level (or was served from cache). */
export function reportNetworkFailure() {
  clearTimeout(failureDebounce);
  failureDebounce = setTimeout(() => {
    checkConnection();
  }, 300);
}

/** Called by apiClient when a real network response arrived. */
export function reportNetworkSuccess() {
  if (state.status !== 'online') {
    setStatus('online');
  }
}

export function startNetworkMonitor() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // TanStack Query follows *our* verified status instead of raw browser events.
  onlineManager.setEventListener((setOnline) => {
    setOnline(state.status === 'online');
    return networkMonitor.subscribe(() => setOnline(state.status === 'online'));
  });

  window.addEventListener('online', () => {
    checkConnection();
  });
  window.addEventListener('offline', () => {
    setStatus('offline');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkConnection();
    } else {
      clearTimeout(pollTimer);
    }
  });

  checkConnection();
}

export const networkMonitor = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
};
