// Menengai Cloud service worker
// Strategy:
//   - Navigations: network-first, fall back to cached page, then to /offline.html
//   - Static assets (same-origin GET, non-API): stale-while-revalidate
//   - API / auth / cross-origin: network-only (never cache auth or live data)

const VERSION = 'mc-v3';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

const PRECACHE = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Paths we must never serve from cache (auth + live data must always hit network)
const NETWORK_ONLY = [/^\/api\//, /^\/auth\//];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests; let the browser deal with cross-origin (Supabase, Auth0, GA, fonts)
  if (url.origin !== self.location.origin) return;

  // Never cache auth / API
  if (NETWORK_ONLY.some((re) => re.test(url.pathname))) return;

  // Never intercept React Server Component (RSC) flight requests. These are
  // App Router client navigations (RSC:1 header / ?_rsc= query) that stream a
  // flight payload — caching or substituting an HTML fallback corrupts the
  // stream and crashes the flight reader (enqueueModel / "convert value to Response").
  if (
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // Navigations → network-first with offline fallback.
  // Only ever fall back to the cached *document* or offline.html, both of which
  // are real HTML Responses; never serve a cached flight/asset to a navigation.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match('/offline.html');
          // respondWith requires a Response — never resolve to undefined.
          return offline || Response.error();
        })
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  // Guard every path so respondWith always receives a real Response.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
