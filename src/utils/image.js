/**
 * DummyJSON's CDN sends `Access-Control-Allow-Origin: *`, so its images are requested
 * in CORS mode. The Service Worker then receives a readable (non-opaque) response it
 * can store efficiently with a timestamp for cache-first + expiration.
 * Arbitrary user-supplied image URLs keep the default (no-cors) mode so they still load.
 */
export function imageCorsProps(src) {
  try {
    const { hostname } = new URL(src, window.location.href);
    if (hostname === 'cdn.dummyjson.com' || hostname === 'dummyjson.com') {
      return { crossOrigin: 'anonymous' };
    }
  } catch {
    /* data: URLs or invalid URLs */
  }
  return {};
}
