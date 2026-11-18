export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://dummyjson.com'
).replace(/\/$/, '');

/** Base path the app is served from ("/" locally, "/Task6.Auth/" on GitHub Pages). */
export const APP_BASE_URL = import.meta.env.BASE_URL || '/';

/** Runtime cache names — must match pwa/service-worker.js. */
export const CACHE_NAMES = {
  prefix: 'novastore-',
  precachePrefix: 'novastore-precache-',
  api: 'novastore-api-v1',
  static: 'novastore-static-v1',
};
