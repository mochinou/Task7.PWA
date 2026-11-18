import { CACHE_NAMES } from './config';

/**
 * Read-only helpers around the Cache Storage API used by the Service Worker.
 * They power the /offline page ("available offline") and the PWA status panel.
 */

const isCacheApiAvailable = () => typeof window !== 'undefined' && 'caches' in window;

/** Products whose detail responses are stored in the SW API cache. */
export async function getOfflineProducts(limit = 6) {
  if (!isCacheApiAvailable()) return [];
  try {
    const cache = await caches.open(CACHE_NAMES.api);
    const requests = await cache.keys();
    const detailRequests = requests.filter((req) =>
      /\/products\/\d+$/.test(new URL(req.url).pathname)
    );

    const items = await Promise.all(
      detailRequests.map(async (req) => {
        try {
          const response = await cache.match(req, { ignoreVary: true });
          if (!response) return null;
          const product = await response.json();
          return {
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            price: product.price,
            cachedAt: Number(response.headers.get('X-SW-Cached-At')) || null,
          };
        } catch {
          return null;
        }
      })
    );

    return items
      .filter(Boolean)
      .sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Entry counts per NovaStore cache + storage estimate. */
export async function getCacheStats() {
  if (!isCacheApiAvailable()) return { supported: false, caches: [], usage: null, quota: null };

  const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_NAMES.prefix));
  const stats = await Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      let type = 'Other';
      if (name.startsWith(CACHE_NAMES.precachePrefix)) type = 'App shell (precache)';
      else if (name === CACHE_NAMES.api) type = 'Public API data';
      else if (name === CACHE_NAMES.static) type = 'Images & fonts';
      return { name, type, entries: keys.length };
    })
  );

  let usage = null;
  let quota = null;
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage ?? null;
      quota = estimate.quota ?? null;
    } catch {
      /* ignore */
    }
  }

  return { supported: true, caches: stats, usage, quota };
}

/** Deletes runtime caches (API data + images). The app shell stays installed. */
export async function clearRuntimeCaches() {
  if (!isCacheApiAvailable()) return;
  await Promise.all([caches.delete(CACHE_NAMES.api), caches.delete(CACHE_NAMES.static)]);
}
