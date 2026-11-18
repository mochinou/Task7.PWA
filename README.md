# NovaStore — Installable PWA with React Router, Server-Data Caching & Firebase Authentication

A React single-page application featuring multi-page routing, URL-synchronized search, category filtering, sorting, pagination, **TanStack Query** server-data caching & invalidation, environment variable configuration, and **Firebase Authentication** (Email/Password & Google Sign-In).

> **Live demo:** https://mochinou.github.io/Task6.Auth/ (GitHub Pages)

---

## Progressive Web App (PWA)

NovaStore is an installable, offline-capable PWA. All features from the previous homeworks (routing, URL-synced filters, TanStack Query caching, CRUD, Firebase Auth) are preserved.

### 1. Manifest & installation
- `public/manifest.json` — `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color`, `id`, shortcuts.
- Icons: `icons/icon-192.png`, `icons/icon-512.png` (`purpose: any`) + maskable 192/512 + `apple-touch-icon.png`.
- Linked in `index.html` (`<link rel="manifest">`, `theme-color`, Apple meta tags).
- Relative `start_url` / `scope` (`./`) so the same manifest works on `/` and on `/Task6.Auth/`.
- Custom **Install app** button (captures `beforeinstallprompt`) in the navbar / mobile menu / About page.

### 2. Service Worker lifecycle (hand-written, no Workbox)
| File | Purpose |
| --- | --- |
| `pwa/service-worker.js` | SW source: `install`, `activate`, `fetch`, `message` handlers |
| `pwa/vite-plugin-service-worker.js` | Build step: injects precache manifest + content-hash version, writes `dist/sw.js`, creates `404.html` |
| `src/pwa/serviceWorkerRegistration.js` | Registration, update detection, `applyUpdate()` |

- **install** — precaches the app shell: `index.html`, hashed JS/CSS bundles, icons, `manifest.json`, `offline.html` (`cache: 'reload'` bypasses the HTTP cache).
- **activate** — deletes every `novastore-*` cache that is not part of the current version, enforces runtime cache limits, `clients.claim()`.
- **Versioned caches** — `novastore-precache-<content-hash>`; every deploy with changed code produces a byte-different `sw.js`.
- **Update flow** — the new worker waits; the UI shows *“A new version is available → Update now”*. The button posts `SKIP_WAITING`, the page reloads once on `controllerchange`. The app checks for updates on focus, on reconnect and every 30 min. `updateViaCache: 'none'` — users never have to clear storage manually.

### 3. Runtime caching
| Resource | Strategy | Limits |
| --- | --- | --- |
| App shell | Precache, cache-first | Versioned per deploy |
| Navigations (SPA routes) | App shell from precache → network → `offline.html` | — |
| Public API `GET /products*` (list, search, category, details, categories) | **Network-first** (4 s timeout) → cache fallback | 80 entries · 7 days |
| Images & fonts | **Cache-first** | 120 entries · 30 days |
| Firebase Auth / tokens / Google profile photos / POST · PUT · DELETE | Network-only, **never cached** | — |

- Cached API responses are stamped with `X-SW-Cached-At`; when served offline the SW adds `X-SW-Source: cache`. `apiClient` exposes this as `meta`, and the UI shows **“You are viewing saved offline data from …”** plus an *Offline copy* badge.
- Expiration: entries older than `maxAgeSeconds` are deleted; oldest entries are trimmed above `maxEntries`.
- Failed requests never crash the app: uncached API calls get a JSON `503 { offline: true }`, missing images get an SVG placeholder, queries use `networkMode: 'offlineFirst'` and don't retry offline errors, mutations fail fast with a clear message.
- DummyJSON images are requested with `crossOrigin="anonymous"` so the SW stores readable (non-opaque) responses.

### 4. Offline page & connectivity
- `/offline` React route (inside the precached app shell) with a styled message, **Retry Connection** button, a list of pages and products available offline, and auto-return to the requested page when the connection comes back.
- `public/offline.html` — fully inline static fallback used by the SW when a navigation cannot be served at all.
- If a page needs data that was never cached, the app redirects to `/offline?from=<page>`.
- **Real connectivity detection** (`src/services/networkMonitor.js`): browser events + heartbeat request to the API + results of real requests. It works even when `navigator.onLine` is wrong (e.g. Wi-Fi without internet). The status drives TanStack Query's `onlineManager`, so data is refetched as soon as the connection returns.
- Navbar indicator (Online / Offline / Reconnecting), offline banner, “Back online” confirmation; create / edit / delete are disabled while offline.

### 5. Mobile
- Works from **320 px** width, portrait and landscape (tested at 320, 375, 414, 740×360, 844×390, 768).
- Responsive hamburger menu (closes on navigation / Escape / backdrop, locks body scroll).
- Single-column cards, stacked filters, compact pagination, bottom-sheet modal, stacked tables, full-width actions.
- 44 px touch targets, 16 px inputs (no iOS zoom), safe-area insets for standalone mode, no horizontal scrolling.

### Deployment (GitHub Pages)
1. Push to `main` — `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo>/` and deploys `dist/`.
2. Repository **Settings → Pages → Source: GitHub Actions** (one time).
3. Firebase Console → Authentication → Settings → **Authorized domains** → add `mochinou.github.io`.

Test locally the same way as in production:
```bash
BASE_PATH=/Task6.Auth/ npm run build
BASE_PATH=/Task6.Auth/ npx vite preview   # http://localhost:4173/Task6.Auth/
```
The Service Worker is registered only in production builds (`npm run build` + `vite preview`), not in `npm run dev`.

### How to verify
- **Install:** Chrome → address bar install icon or the *Install app* button. DevTools → Application → Manifest shows no errors.
- **Offline:** open a few catalog pages and products → DevTools → Network → *Offline* → reload: saved pages show the “saved offline data” notice; an unopened product redirects to `/offline`.
- **Update:** deploy a change → reopen the tab → *“A new version is available” → Update now*.
- **Caches:** About page → *PWA status* panel (cache version, entries per cache, storage, “Clear offline data”).

---

## Features

- **Routing & Navigation (`react-router-dom`)**
  - `/` — Home page with featured top-rated products and category shortcuts
  - `/products` — Product catalog with URL-synced search (`?q=`), category filter (`?category=`), sorting (`?sort=`), and pagination (`?page=`)
  - `/products/:id` — Dynamic product detail view with gallery, specifications, edit modal, and delete action
  - `/about` — Architecture and caching summary
  - `/login` — Email/Password login and Google Sign-In
  - `/signup` — Account registration with email, password, confirm password, and client-side validation
  - `/profile` — Protected route displaying user Email, Firebase UID, authentication provider, and Logout
  - `*` — 404 Not Found fallback page
- **Authentication & Persistent Sessions (`firebase/auth`)**
  - Initialized in a dedicated `src/firebase.js` module using `VITE_FIREBASE_*` environment variables
  - `AuthContext` (`AuthProvider` + `useAuth`) tracking auth state via `onAuthStateChanged`
  - Persistent browser sessions (`browserLocalPersistence`) across page reloads
  - Conditional `NavBar` rendering (`Login` / `Signup` vs `Profile` / `Logout`) and `ProtectedRoute` redirection to `/login`
- **Server Data & Caching (`@tanstack/react-query`)**
  - Structured query keys for product lists, individual product details, and category lists
  - Automatic cache expiration, stale-while-revalidate background updates, and manual revalidation
  - Automatic cache invalidation after Create (`POST`), Update (`PUT`), and Delete (`DELETE`) operations
  - Race-condition protection via `AbortSignal` cancellation and debounced search queries
  - Dedicated loading skeletons, error states with retry, and empty filter states

---

## Caching Strategy & Cache Invalidation

### 1. Query Keys Structure
All server-state cache entries are organized through a hierarchical key factory in `src/services/queryKeys.js`:

- `['products', 'list', { page, limit, search, category, sortBy, order }]` — Caches each unique combination of pagination, search query, category filter, and sort order independently.
- `['products', 'detail', id]` — Caches individual product detail responses by ID.
- `['products', 'categories']` — Caches the list of available product categories.

### 2. Expiration & Revalidation Strategy
Configured globally in `src/services/queryClient.js`:

- **`staleTime: 2 minutes` (`120,000 ms`)** — Cached product lists and product details are treated as fresh for 2 minutes (10 minutes for categories). Navigating back and forth between catalog pages or revisiting a viewed product serves data instantaneously from memory without redundant network requests.
- **`gcTime: 10 minutes` (`600,000 ms`)** — Inactive cache entries expire and are garbage-collected from memory after 10 minutes of inactivity.
- **Background Revalidation (`refetchOnWindowFocus` & `refetchOnReconnect`)** — Once an entry becomes stale (> 2 minutes old), returning to the browser tab or regaining network connectivity revalidates data in the background while keeping UI responsive.

### 3. Preventing Outdated Requests from Overwriting Newer Results
- Every `useQuery` hook forwards TanStack Query's `AbortSignal` (`{ signal }`) directly into `fetch` inside `src/services/apiClient.js`. When a user rapidly changes filters, pages, or search terms, in-flight outdated requests are aborted automatically.
- Because each filter/search state maps to its own deterministic query key, a slower earlier network call can never overwrite the state of a newer query. Search input is additionally debounced (`useDebounce`, 350ms).

### 4. When Cached Data Is Invalidated
Cache invalidation is triggered automatically inside mutation hooks (`src/hooks/useProducts.js`):

- **Create Product (`useCreateProduct` — `POST /products/add`)**: Calls `queryClient.invalidateQueries({ queryKey: ['products', 'list'] })`, marking all cached catalog pages stale and immediately refetching active list views.
- **Update Product (`useUpdateProduct` — `PUT /products/:id`)**: Calls `queryClient.invalidateQueries` on both `['products', 'detail', id]` and `['products', 'list']` so both the detail page and catalog cards reflect updated product fields.
- **Delete Product (`useDeleteProduct` — `DELETE /products/:id`)**: Removes `['products', 'detail', id]` via `queryClient.removeQueries` and invalidates `['products', 'list']` so deleted items are removed from catalog results.

---

## Project Architecture

```text
src/
├── firebase.js                 # Firebase app, Auth, Google provider & persistence setup
├── pwa/
│   ├── serviceWorkerRegistration.js  # SW registration + update lifecycle store
│   └── installPrompt.js        # beforeinstallprompt capture / Install app
├── context/
│   └── AuthContext.jsx         # AuthContext, AuthProvider, and useAuth hook
├── hooks/
│   ├── useAuth.js              # Auth hook re-export
│   ├── useDebounce.js          # Debounce hook for search input
│   └── useProducts.js          # TanStack Query & Mutation hooks + cache invalidation
├── services/
│   ├── apiClient.js            # Fetch wrapper with AbortSignal, offline errors & SW cache meta
│   ├── networkMonitor.js       # Real connectivity detection (heartbeat) + onlineManager
│   ├── offlineCacheService.js  # Cache Storage helpers (offline products, stats, clear)
│   ├── authService.js          # Firebase Auth methods & error code mapping
│   ├── productService.js       # Product REST API calls (list, detail, categories, CRUD)
│   ├── queryClient.js          # QueryClient TTL / revalidation configuration
│   └── queryKeys.js            # Hierarchical query key factory
├── components/                 # Reusable UI components (NavBar, ProtectedRoute, Filters, etc.)
└── pages/                      # Route page views (Home, Products, Detail, Login, Signup, Profile)
```

UI components never access `localStorage` or execute `fetch` / Firebase SDK calls directly; all external side effects are encapsulated inside `src/services/` and `src/hooks/`.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=https://dummyjson.com
```

### 3. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Register a **Web App** (`</>`) in Project Settings and copy the config values into `.env.local`.
3. Open **Build → Authentication → Sign-in method** and enable:
   - **Email/Password**
   - **Google**
4. When deploying (e.g., Vercel or Netlify), add all `VITE_FIREBASE_*` variables in your hosting dashboard and add your deployed domain under **Firebase Console → Authentication → Settings → Authorized domains**.

### 4. Run Locally & Build

```bash
npm run dev
npm run build
```
