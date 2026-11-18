/* eslint-disable no-restricted-globals */
/**
 * NovaStore Service Worker (hand-written, no Workbox).
 *
 * Three constants below are injected at build time by pwa/vite-plugin-service-worker.js:
 *   - CACHE_VERSION  -> content hash of the build (changes on every deploy)
 *   - PRECACHE_FILES -> list of app-shell files (hashed JS/CSS, icons, offline page)
 *   - API_BASE_URL   -> public REST API base URL (VITE_API_BASE_URL)
 *
 * Strategies
 *   - App shell (precache)        : cache-first, versioned, refreshed on every deploy
 *   - Navigations                 : app shell from precache -> network -> offline.html
 *   - Public API (GET /products*) : network-first with timeout, falls back to cache (marked)
 *   - Images / fonts              : cache-first with expiration (max entries + max age)
 *   - Auth / tokens / private data: never intercepted, never cached
 */

const CACHE_VERSION = '__CACHE_VERSION__';
const PRECACHE_FILES = self.__PRECACHE_MANIFEST__;
const API_BASE_URL = '__API_BASE_URL__';

const CACHE_PREFIX = 'novastore';
const RUNTIME_SCHEMA = 'v1'; // bump to wipe runtime caches when their format changes

const PRECACHE = `${CACHE_PREFIX}-precache-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${RUNTIME_SCHEMA}`;
const API_CACHE = `${CACHE_PREFIX}-api-${RUNTIME_SCHEMA}`;

const CACHE_POLICIES = {
  [STATIC_CACHE]: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
  [API_CACHE]: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
};

const API_NETWORK_TIMEOUT_MS = 4000;
const POLICY_THROTTLE_MS = 5000;

const SCOPE_URL = new URL(self.registration.scope);
const toScopeUrl = (file) => new URL(file, SCOPE_URL).href;
const APP_SHELL_URL = toScopeUrl('index.html');
const OFFLINE_URL = toScopeUrl('offline.html');
const PRECACHE_URLS = new Set(PRECACHE_FILES.map(toScopeUrl));

const SW_HEADERS = {
  SOURCE: 'X-SW-Source', // "cache" | "offline" (absent = network)
  CACHED_AT: 'X-SW-Cached-At',
  REASON: 'X-SW-Fallback-Reason',
};
const EXPOSED_HEADERS = Object.values(SW_HEADERS).join(', ');

/* -------------------------------------------------------------------------- */
/*  Request classification                                                    */
/* -------------------------------------------------------------------------- */

// Authentication providers, token endpoints and private user content.
const PRIVATE_HOSTS = [
  /(^|\.)identitytoolkit\.googleapis\.com$/,
  /(^|\.)securetoken\.googleapis\.com$/,
  /(^|\.)firebaseinstallations\.googleapis\.com$/,
  /(^|\.)firestore\.googleapis\.com$/,
  /(^|\.)firebaseio\.com$/,
  /(^|\.)firebaseapp\.com$/,
  /(^|\.)googleusercontent\.com$/, // Google profile photos = private user data
  /^accounts\.google\.com$/,
  /^apis\.google\.com$/,
  /^www\.googleapis\.com$/,
];

const PRIVATE_PATHS = [
  /\/auth(\/|$)/i,
  /\/__\/auth\//i,
  /\/user\/me/i,
  /\/users?(\/|$)/i,
  /\/carts?(\/|$)/i,
  /token/i,
  /\/login/i,
  /\/refresh/i,
];

function isPrivateRequest(request, url) {
  if (request.headers.has('Authorization')) return true;
  // Credentialed API calls (cookies) may return user-specific data. Navigations and
  // plain <img> requests also use credentials "include", so only CORS fetches count.
  if (request.mode === 'cors' && request.credentials === 'include') return true;
  if (PRIVATE_HOSTS.some((pattern) => pattern.test(url.hostname))) return true;
  // Our own origin is a static host (SPA routes like /login are just the app shell).
  if (url.origin === SCOPE_URL.origin) return false;
  return PRIVATE_PATHS.some((pattern) => pattern.test(url.pathname));
}

function isPublicApiRequest(url) {
  // Only the public product catalogue (list, search, category, details, categories).
  return url.href.startsWith(`${API_BASE_URL}/products`);
}

function isStaticAsset(request, url) {
  if (request.destination === 'image' || request.destination === 'font') return true;
  return /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname);
}

function withoutSearch(url) {
  return `${url.origin}${url.pathname}`;
}

/* -------------------------------------------------------------------------- */
/*  Lifecycle: install -> activate                                            */
/* -------------------------------------------------------------------------- */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // cache: 'reload' bypasses the HTTP cache so a new deploy never precaches stale files.
      await cache.addAll(
        PRECACHE_FILES.map((file) => new Request(toScopeUrl(file), { cache: 'reload' }))
      );
      // No automatic skipWaiting(): an updated worker waits until the user presses
      // "Update" in the UI (see SKIP_WAITING message below). The very first install
      // activates immediately because there is no previous worker.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const expected = new Set([PRECACHE, STATIC_CACHE, API_CACHE]);
      const cacheNames = await caches.keys();

      // Remove caches from previous versions (old precaches, old runtime schemas).
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && !expected.has(name))
          .map((name) => caches.delete(name))
      );

      await Promise.all(Object.keys(CACHE_POLICIES).map((name) => enforcePolicy(name, true)));
      await self.clients.claim();

      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach((client) =>
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION })
      );
    })()
  );
});

self.addEventListener('message', (event) => {
  const message = event.data || {};

  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (message.type === 'GET_VERSION') {
    const reply = { type: 'SW_VERSION', version: CACHE_VERSION };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
  }
});

/* -------------------------------------------------------------------------- */
/*  Fetch routing                                                             */
/* -------------------------------------------------------------------------- */

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // POST/PUT/DELETE always go to the network

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never touch auth flows, tokens or private user data.
  if (isPrivateRequest(request, url)) return;

  if (request.mode === 'navigate') {
    if (url.href.startsWith(SCOPE_URL.href)) {
      event.respondWith(handleNavigation(request, url));
    }
    return;
  }

  if (url.origin === SCOPE_URL.origin && PRECACHE_URLS.has(withoutSearch(url))) {
    event.respondWith(precacheFirst(request, url));
    return;
  }

  if (isPublicApiRequest(url)) {
    networkFirst(event);
    return;
  }

  if (isStaticAsset(request, url)) {
    cacheFirst(event);
  }
  // Everything else: default browser networking.
});

/* -------------------------------------------------------------------------- */
/*  Strategies                                                                */
/* -------------------------------------------------------------------------- */

async function handleNavigation(request, url) {
  const precache = await caches.open(PRECACHE);

  // Real precached documents (e.g. offline.html) are returned as they are.
  const exactUrl = withoutSearch(url);
  if (PRECACHE_URLS.has(exactUrl) && exactUrl !== APP_SHELL_URL) {
    const exact = await precache.match(exactUrl);
    if (exact) return exact;
  }

  // SPA routes: serve the versioned app shell. React Router renders the page and
  // the data layer decides whether cached data exists or /offline must be shown.
  const shell = await precache.match(APP_SHELL_URL);
  if (shell) return shell;

  try {
    return await fetch(request);
  } catch {
    const offlinePage = await precache.match(OFFLINE_URL);
    return (
      offlinePage ||
      new Response('<h1>You are offline</h1>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function precacheFirst(request, url) {
  const cached = await caches.match(withoutSearch(url), { cacheName: PRECACHE });
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

/**
 * Network-first for the public API. Fresh responses are stored with a timestamp.
 * If the network fails (or is slower than API_NETWORK_TIMEOUT_MS and a copy exists),
 * the cached copy is returned and marked with X-SW-Source: cache so the UI can tell
 * the user they are looking at saved data.
 */
function networkFirst(event) {
  const { request } = event;

  let settleCacheUpdate;
  event.waitUntil(new Promise((resolve) => (settleCacheUpdate = resolve)));

  const network = fetch(request).then(
    (response) => {
      if (isCacheableApiResponse(response)) {
        settleCacheUpdate(
          putWithTimestamp(API_CACHE, request.url, response.clone())
            .then(() => enforcePolicy(API_CACHE))
            .catch(() => {})
        );
      } else {
        settleCacheUpdate();
      }
      return response;
    },
    (error) => {
      settleCacheUpdate();
      throw error;
    }
  );

  event.respondWith(
    (async () => {
      try {
        return await withTimeout(network, API_NETWORK_TIMEOUT_MS);
      } catch (error) {
        const timedOut = error && error.name === 'TimeoutError';
        const cached = await matchFresh(API_CACHE, request.url);
        if (cached) return markAsCached(cached, timedOut ? 'slow-network' : 'offline');

        if (timedOut) {
          try {
            return await network; // slow but alive, and nothing cached: keep waiting
          } catch {
            /* fall through */
          }
        }
        return offlineApiResponse();
      }
    })()
  );
}

/** Cache-first for images and fonts (with expiration). */
function cacheFirst(event) {
  const { request } = event;

  event.respondWith(
    (async () => {
      const cached = await matchFresh(STATIC_CACHE, request.url);
      // An opaque response can't satisfy a CORS request — refetch in that case.
      if (cached && !(cached.type === 'opaque' && request.mode === 'cors')) {
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          event.waitUntil(
            (response.type === 'opaque'
              ? caches.open(STATIC_CACHE).then((cache) => cache.put(request.url, copy))
              : putWithTimestamp(STATIC_CACHE, request.url, copy)
            )
              .then(() => enforcePolicy(STATIC_CACHE))
              .catch(() => {})
          );
        }
        return response;
      } catch {
        if (cached) return cached;
        if (request.destination === 'image') return imagePlaceholder();
        return Response.error();
      }
    })()
  );
}

/* -------------------------------------------------------------------------- */
/*  Cache helpers                                                             */
/* -------------------------------------------------------------------------- */

function isCacheableApiResponse(response) {
  if (!response || !response.ok || response.status !== 200) return false;
  if (response.type === 'opaque' || response.type === 'error') return false;
  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('private')) return false; // private data never goes into shared caches
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

async function putWithTimestamp(cacheName, key, response) {
  const headers = new Headers(response.headers);
  headers.set(SW_HEADERS.CACHED_AT, String(Date.now()));
  const body = await response.blob();
  const stamped = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  const cache = await caches.open(cacheName);
  await cache.put(key, stamped);
}

function isExpired(response, cacheName) {
  const policy = CACHE_POLICIES[cacheName];
  if (!policy || !policy.maxAgeSeconds || response.type === 'opaque') return false;
  const cachedAt = Number(response.headers.get(SW_HEADERS.CACHED_AT));
  if (!cachedAt) return false;
  return Date.now() - cachedAt > policy.maxAgeSeconds * 1000;
}

async function matchFresh(cacheName, key) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(key, { ignoreVary: true });
  if (!cached) return undefined;
  if (isExpired(cached, cacheName)) {
    await cache.delete(key, { ignoreVary: true });
    return undefined;
  }
  return cached;
}

const lastPolicyRun = new Map();

/** Removes expired entries, then trims the oldest entries above maxEntries. */
async function enforcePolicy(cacheName, force = false) {
  const policy = CACHE_POLICIES[cacheName];
  if (!policy) return;

  const now = Date.now();
  if (!force && now - (lastPolicyRun.get(cacheName) || 0) < POLICY_THROTTLE_MS) return;
  lastPolicyRun.set(cacheName, now);

  const cache = await caches.open(cacheName);
  let keys = await cache.keys();

  if (policy.maxAgeSeconds) {
    const expired = [];
    for (const key of keys) {
      const response = await cache.match(key, { ignoreVary: true });
      if (response && isExpired(response, cacheName)) expired.push(key);
    }
    await Promise.all(expired.map((key) => cache.delete(key, { ignoreVary: true })));
    if (expired.length) keys = await cache.keys();
  }

  // Cache.keys() is in insertion order and put() re-appends -> oldest writes first.
  if (policy.maxEntries && keys.length > policy.maxEntries) {
    const overflow = keys.slice(0, keys.length - policy.maxEntries);
    await Promise.all(overflow.map((key) => cache.delete(key, { ignoreVary: true })));
  }
}

async function markAsCached(cached, reason) {
  const headers = new Headers(cached.headers);
  headers.set(SW_HEADERS.SOURCE, 'cache');
  headers.set(SW_HEADERS.REASON, reason);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  return new Response(await cached.blob(), {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({
      message: 'You are offline and this data has not been saved for offline use yet.',
      offline: true,
    }),
    {
      status: 503,
      statusText: 'Offline',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': EXPOSED_HEADERS,
        [SW_HEADERS.SOURCE]: 'offline',
      },
    }
  );
}

function imagePlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#EEF2FF"/>
    <path d="M150 200l40-45 30 32 20-22 40 35H150z" fill="#C7D2FE"/>
    <circle cx="175" cy="120" r="16" fill="#C7D2FE"/>
    <text x="200" y="250" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#6366F1">Image unavailable offline</text>
  </svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('Network timeout');
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
