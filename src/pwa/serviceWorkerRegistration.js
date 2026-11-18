import { APP_BASE_URL } from '../services/config';

/**
 * Registers /sw.js and exposes its update lifecycle as a small external store:
 *   - offlineReady    : first install finished, the app now works offline
 *   - updateAvailable : a new version is installed and *waiting*
 *   - applyUpdate()   : tells the waiting worker to skipWaiting(); when it takes
 *                       control (`controllerchange`) the page reloads once so the
 *                       new HTML/JS/CSS are used — no manual storage clearing needed.
 */

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

const listeners = new Set();

let state = {
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  enabled: import.meta.env.PROD,
  registration: null,
  waitingWorker: null,
  offlineReady: false,
  updateAvailable: false,
  updating: false,
  version: null,
  error: null,
};

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function trackInstalling(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installed') return;
    if (navigator.serviceWorker.controller) {
      // An older version controls this page -> new version is waiting.
      setState({ updateAvailable: true, waitingWorker: worker });
    } else {
      // First install: everything is precached.
      setState({ offlineReady: true });
    }
  });
}

export async function requestServiceWorkerVersion() {
  const controller = navigator.serviceWorker?.controller;
  if (!controller) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 2000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      const version = event.data?.version || null;
      setState({ version });
      resolve(version);
    };
    controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
  });
}

export function registerServiceWorker() {
  if (!state.supported || !state.enabled) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    // Reload when a newer worker replaced an existing one, or when the user pressed
    // "Update now". The very first install just claims the page — no reload needed.
    if (!hadController && !state.updating) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_ACTIVATED' || event.data?.type === 'SW_VERSION') {
      setState({ version: event.data.version || null });
    }
  });

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${APP_BASE_URL}sw.js`, {
        scope: APP_BASE_URL,
        updateViaCache: 'none', // always revalidate sw.js with the server
      });
      setState({ registration });

      if (registration.waiting && navigator.serviceWorker.controller) {
        setState({ updateAvailable: true, waitingWorker: registration.waiting });
      }
      trackInstalling(registration.installing);
      registration.addEventListener('updatefound', () => {
        trackInstalling(registration.installing);
      });

      const checkForUpdate = () => registration.update().catch(() => {});
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.addEventListener('online', checkForUpdate);

      requestServiceWorkerVersion();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setState({ error: error?.message || 'Registration failed' });
    }
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export function applyUpdate() {
  const worker = state.waitingWorker || state.registration?.waiting;
  if (!worker) {
    window.location.reload();
    return;
  }
  setState({ updating: true });
  worker.postMessage({ type: 'SKIP_WAITING' });
}

export async function checkForUpdates() {
  if (!state.registration) return false;
  try {
    await state.registration.update();
    return true;
  } catch {
    return false;
  }
}

export function dismissUpdate() {
  setState({ updateAvailable: false });
}

export function dismissOfflineReady() {
  setState({ offlineReady: false });
}

export const serviceWorkerStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
};
