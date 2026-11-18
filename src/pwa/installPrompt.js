/**
 * Captures the `beforeinstallprompt` event (Chromium browsers) so the app can show
 * its own "Install app" button. Must be initialised as early as possible.
 */

const listeners = new Set();

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true);

let state = {
  canInstall: false,
  installed: isStandalone(),
};

let deferredPrompt = null;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    setState({ canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canInstall: false, installed: true });
  });

  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (event) => {
    setState({ installed: event.matches });
  });
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  setState({ canInstall: false });
  return outcome;
}

export const installPromptStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
};
